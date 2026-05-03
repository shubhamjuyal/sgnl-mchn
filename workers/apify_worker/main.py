"""Apify worker: triggers an Instagram scrape, lands posts in raw_data, enqueues detect."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime
from typing import Any

from apify_client import ApifyClient

from shared.bus import enqueue, run_loop
from shared.config import CONFIG
from shared.db import get_conn
from shared.log import get_logger
from shared import blob

log = get_logger(__name__)


def _parse_ts(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value)
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _open_scrape_log(source_id: int) -> int:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO scrape_log (source_id, started_at, status) VALUES (%s, NOW(), 'running') RETURNING id",
            (source_id,),
        )
        row = cur.fetchone()
        return int(row["id"])


def _close_scrape_log(
    log_id: int, status: str, processed: int, matched: int, discarded: int, error: str | None = None
) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """UPDATE scrape_log
               SET finished_at=NOW(), status=%s,
                   records_processed=%s, records_matched=%s, records_discarded=%s,
                   error=%s
               WHERE id=%s""",
            (status, processed, matched, discarded, error, log_id),
        )


def _load_targets(source_id: int, account_ids: list[int] | None) -> list[dict[str, Any]]:
    sql = """SELECT id, handles
             FROM account
             WHERE handles->>'instagram' IS NOT NULL
               AND account_status = 'active'"""
    params: tuple[Any, ...] = ()
    if account_ids:
        sql += " AND id = ANY(%s)"
        params = (account_ids,)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def _insert_raw_data(
    source_id: int,
    account_id: int,
    native_id: str,
    content: str,
    url: str | None,
    posted_at: datetime | None,
    payload_blob_ref: str,
    content_hash: str,
    source_meta: dict[str, Any],
) -> int | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO raw_data
                 (source_id, account_id, native_id, content, url, posted_at,
                  payload_blob_ref, content_hash, source_meta)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb)
               ON CONFLICT (source_id, native_id) DO NOTHING
               RETURNING id""",
            (
                source_id,
                account_id,
                native_id,
                content,
                url,
                posted_at,
                payload_blob_ref,
                content_hash,
                json.dumps(source_meta),
            ),
        )
        row = cur.fetchone()
        return int(row["id"]) if row else None


def _touch_source(source_id: int) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("UPDATE source SET last_run_at=NOW() WHERE id=%s", (source_id,))


def handle_scrape_instagram(payload: dict[str, Any]) -> None:
    if not CONFIG.apify_token:
        log.warning("apify.skip", reason="APIFY_TOKEN not configured", payload=payload)
        return

    source_id = int(payload["sourceId"])
    account_ids = payload.get("accountIds")

    targets = _load_targets(source_id, account_ids)
    if not targets:
        log.info("apify.skip", reason="no active accounts with instagram handle", source_id=source_id)
        return

    handle_to_account: dict[str, int] = {}
    direct_urls: list[str] = []
    for row in targets:
        handle = row["handles"].get("instagram")
        if not handle:
            continue
        normalized = handle.lstrip("@").lower()
        handle_to_account[normalized] = int(row["id"])
        direct_urls.append(f"https://www.instagram.com/{normalized}/")

    log_id = _open_scrape_log(source_id)
    log.info("apify.run", source_id=source_id, handles=len(direct_urls), scrape_log_id=log_id)

    processed = 0
    matched = 0
    discarded = 0

    try:
        client = ApifyClient(CONFIG.apify_token)
        run = client.actor(CONFIG.apify_instagram_actor_id).call(
            run_input={
                "directUrls": direct_urls,
                "resultsType": "posts",
                "resultsLimit": 30,
            }
        )
        if run is None:
            raise RuntimeError("apify actor.call returned None")

        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            processed += 1

            owner = (item.get("ownerUsername") or "").lower()
            account_id = handle_to_account.get(owner)
            if account_id is None:
                discarded += 1
                continue

            native_id = str(item.get("id") or item.get("shortCode") or "")
            if not native_id:
                discarded += 1
                continue

            payload_bytes = json.dumps(item, default=str, sort_keys=True).encode("utf-8")
            blob_ref = blob.put(payload_bytes, "json")
            content_hash = hashlib.sha256(payload_bytes).hexdigest()
            content = item.get("caption") or ""
            url = item.get("url")
            posted_at = _parse_ts(item.get("timestamp"))
            source_meta = {
                "ownerUsername": owner,
                "likesCount": item.get("likesCount"),
                "commentsCount": item.get("commentsCount"),
                "type": item.get("type"),
                "displayUrl": item.get("displayUrl"),
            }

            new_id = _insert_raw_data(
                source_id=source_id,
                account_id=account_id,
                native_id=native_id,
                content=content,
                url=url,
                posted_at=posted_at,
                payload_blob_ref=blob_ref,
                content_hash=content_hash,
                source_meta=source_meta,
            )
            if new_id is None:
                discarded += 1
                continue

            matched += 1
            enqueue("detect", {"rawDataId": new_id})

    except Exception as e:
        _close_scrape_log(log_id, "failed", processed, matched, discarded, error=str(e))
        raise

    _close_scrape_log(log_id, "done", processed, matched, discarded)
    _touch_source(source_id)
    log.info(
        "apify.done",
        source_id=source_id,
        processed=processed,
        matched=matched,
        discarded=discarded,
    )


def main() -> None:
    run_loop({"scrape.instagram": handle_scrape_instagram})


if __name__ == "__main__":
    main()
