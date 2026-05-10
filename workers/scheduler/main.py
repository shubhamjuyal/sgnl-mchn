"""Cron scheduler for scrape jobs.

Polls `source` rows and enqueues scrape jobs when `next_run_at` is due.
"""
from __future__ import annotations

from datetime import UTC, datetime
import json
import time

from croniter import croniter

from shared.config import CONFIG
from shared.db import get_conn
from shared.log import get_logger

log = get_logger(__name__)

SOURCE_TO_JOB_TYPE: dict[str, str] = {
    "instagram": "scrape.instagram",
    "website": "scrape.website",
}


def _to_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def _next_fire(cron_expr: str, base: datetime) -> datetime:
    value = croniter(cron_expr, base).get_next(datetime)
    return _to_utc(value)


def run_scheduler_loop() -> None:
    poll_seconds = max(CONFIG.poll_interval_ms / 1000, 1.0)
    log.info("scheduler.start", poll_seconds=poll_seconds)

    while True:
        now = datetime.now(UTC)
        try:
            with get_conn() as conn, conn.cursor() as cur:
                cur.execute(
                    """SELECT id, source_name, cron_expression, next_run_at
                       FROM source
                       WHERE status IN ('ACTIVE', 'PARTIAL')
                         AND cron_expression IS NOT NULL"""
                )
                rows = cur.fetchall()

                for row in rows:
                    source_id = int(row["id"])
                    source_name = str(row["source_name"])
                    cron_expr = str(row["cron_expression"])
                    next_run_at = row["next_run_at"]

                    job_type = SOURCE_TO_JOB_TYPE.get(source_name)
                    if not job_type:
                        continue

                    if next_run_at is None:
                        computed_next = _next_fire(cron_expr, now)
                        cur.execute(
                            "UPDATE source SET next_run_at = %s, updated_at = NOW() WHERE id = %s",
                            (computed_next, source_id),
                        )
                        log.info(
                            "scheduler.next_initialized",
                            source_id=source_id,
                            source_name=source_name,
                            cron=cron_expr,
                            next_run_at=computed_next.isoformat(),
                        )
                        continue

                    due_at = _to_utc(next_run_at)
                    if due_at > now:
                        continue

                    cur.execute(
                        """INSERT INTO job (type, payload, status, scheduled_for)
                           VALUES (%s, %s::jsonb, 'pending', NOW())""",
                        (job_type, json.dumps({"sourceId": source_id})),
                    )
                    next_due = _next_fire(cron_expr, now)
                    cur.execute(
                        """UPDATE source
                           SET last_run_at = NOW(),
                               next_run_at = %s,
                               updated_at = NOW()
                           WHERE id = %s""",
                        (next_due, source_id),
                    )
                    log.info(
                        "scheduler.enqueued",
                        source_id=source_id,
                        source_name=source_name,
                        job_type=job_type,
                        cron=cron_expr,
                        next_run_at=next_due.isoformat(),
                    )
        except Exception as e:
            log.exception("scheduler.tick_failed", error=str(e))

        time.sleep(poll_seconds)


def main() -> None:
    run_scheduler_loop()


if __name__ == "__main__":
    main()
