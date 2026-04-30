"""Postgres job bus. SELECT FOR UPDATE SKIP LOCKED.

The TS side enqueues jobs into the `job` table. Python workers claim
them with SKIP LOCKED, run the handler, then mark done/failed.
"""
from __future__ import annotations

import json
import socket
import time
import uuid
from collections.abc import Callable
from typing import Any

import psycopg

from .config import CONFIG
from .db import get_conn
from .log import get_logger

log = get_logger(__name__)

WORKER_ID = f"{socket.gethostname()}-{uuid.uuid4().hex[:8]}"

CLAIM_SQL = """
WITH next_job AS (
  SELECT id FROM job
  WHERE status = 'pending'
    AND scheduled_for <= NOW()
    AND type = ANY(%s)
  ORDER BY scheduled_for, id
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE job j SET status='processing', started_at=NOW(), worker_id=%s, attempts = j.attempts + 1
FROM next_job
WHERE j.id = next_job.id
RETURNING j.id, j.type, j.payload, j.attempts, j.max_attempts;
"""


def claim_one(types: list[str]) -> dict[str, Any] | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(CLAIM_SQL, (types, WORKER_ID))
        return cur.fetchone()


def mark_done(job_id: int) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE job SET status='done', finished_at=NOW() WHERE id=%s",
            (job_id,),
        )


def mark_failed(job_id: int, err: str, attempts: int, max_attempts: int) -> None:
    next_status = "failed" if attempts < max_attempts else "dead"
    backoff_seconds = min(60 * (2 ** attempts), 3600) if next_status == "failed" else 0
    with get_conn() as conn, conn.cursor() as cur:
        if next_status == "failed":
            cur.execute(
                """UPDATE job SET status='pending', last_error=%s,
                   scheduled_for=NOW() + (%s || ' seconds')::interval,
                   started_at=NULL, worker_id=NULL
                   WHERE id=%s""",
                (err, backoff_seconds, job_id),
            )
        else:
            cur.execute(
                "UPDATE job SET status='dead', last_error=%s, finished_at=NOW() WHERE id=%s",
                (err, job_id),
            )


def enqueue(job_type: str, payload: dict[str, Any], run_at_seconds: int = 0) -> int:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO job (type, payload, scheduled_for)
               VALUES (%s, %s::jsonb, NOW() + (%s || ' seconds')::interval)
               RETURNING id""",
            (job_type, json.dumps(payload), run_at_seconds),
        )
        row = cur.fetchone()
        return int(row["id"])


Handler = Callable[[dict[str, Any]], None]


def run_loop(handlers: dict[str, Handler]) -> None:
    """Block forever, claim jobs of the given types, dispatch to handlers."""
    types = list(handlers.keys())
    log.info("worker.start", worker_id=WORKER_ID, types=types)
    poll_seconds = CONFIG.poll_interval_ms / 1000
    while True:
        try:
            job = claim_one(types)
        except psycopg.Error as e:
            log.error("worker.claim_error", error=str(e))
            time.sleep(poll_seconds)
            continue

        if not job:
            time.sleep(poll_seconds)
            continue

        job_id = int(job["id"])
        job_type = str(job["type"])
        payload = job["payload"]
        attempts = int(job["attempts"])
        max_attempts = int(job["max_attempts"])

        handler = handlers.get(job_type)
        if handler is None:
            log.warning("worker.unknown_type", id=job_id, type=job_type)
            mark_failed(job_id, f"no handler for type {job_type}", attempts, max_attempts)
            continue

        log.info("worker.run", id=job_id, type=job_type)
        try:
            handler(payload)
            mark_done(job_id)
            log.info("worker.done", id=job_id, type=job_type)
        except Exception as e:
            log.exception("worker.fail", id=job_id, type=job_type, error=str(e))
            mark_failed(job_id, str(e), attempts, max_attempts)
