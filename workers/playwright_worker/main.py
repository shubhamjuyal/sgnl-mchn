"""Playwright worker: scrapes retailer homepages, diffs nav structure, lands raw_data, enqueues detect.

Detection target: A3 (website_category_change). The handler renders newly-added nav items
into a phrase-matchable string in raw_data.content so the existing detection worker fires
A3 naturally against its seeded examplePhrases.
"""
from __future__ import annotations

import hashlib
import json
from datetime import UTC, datetime
from typing import Any

from playwright.sync_api import Error as PlaywrightError, sync_playwright

from shared.bus import enqueue, run_loop
from shared.config import CONFIG
from shared.db import get_conn
from shared.log import get_logger
from shared import blob

log = get_logger(__name__)


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


def _load_targets(account_ids: list[int] | None) -> list[dict[str, Any]]:
    sql = """SELECT id, handles, canonical_url
             FROM account
             WHERE account_status = 'active'
               AND (handles->>'website' IS NOT NULL OR canonical_url IS NOT NULL)"""
    params: tuple[Any, ...] = ()
    if account_ids:
        sql += " AND id = ANY(%s)"
        params = (account_ids,)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def _resolve_url(row: dict[str, Any]) -> str | None:
    handles = row.get("handles") or {}
    candidate = handles.get("website") or row.get("canonical_url")
    if not candidate:
        return None
    candidate = candidate.strip()
    if not candidate:
        return None
    if not candidate.startswith(("http://", "https://")):
        candidate = "https://" + candidate
    return candidate


def _load_previous_fingerprint(source_id: int, account_id: int) -> list[str] | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT source_meta
               FROM raw_data
               WHERE source_id = %s AND account_id = %s
               ORDER BY scraped_at DESC
               LIMIT 1""",
            (source_id, account_id),
        )
        row = cur.fetchone()
        if not row:
            return None
        meta = row["source_meta"] or {}
        fp = meta.get("navFingerprint")
        return list(fp) if isinstance(fp, list) else None


def _normalize_nav(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for raw in items:
        if not raw:
            continue
        normalized = " ".join(raw.split()).lower()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        out.append(normalized)
    out.sort()
    return out


def _extract_nav(page: Any) -> list[str]:
    js = """els => els.map(e => (e.innerText || e.textContent || '').trim()).filter(Boolean)"""
    raw_items = page.eval_on_selector_all(CONFIG.playwright_nav_selectors, js)
    return _normalize_nav(raw_items)


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


def _render_diff_content(added: list[str]) -> str:
    pretty = ", ".join(item.title() for item in added)
    return f"New website categories: {pretty}"


def _process_account(
    browser: Any,
    source_id: int,
    account: dict[str, Any],
) -> tuple[bool, bool]:
    """Returns (processed, matched) — processed=fetched ok, matched=new diff row inserted."""
    account_id = int(account["id"])
    url = _resolve_url(account)
    if not url:
        log.info("playwright.account.skip", account_id=account_id, reason="no website")
        return (False, False)

    context = browser.new_context()
    page = context.new_page()
    try:
        page.goto(url, wait_until="networkidle", timeout=CONFIG.playwright_timeout_ms)
        nav_fingerprint = _extract_nav(page)
        html = page.content()
    except PlaywrightError as e:
        log.warning("playwright.account.error", account_id=account_id, url=url, error=str(e))
        return (False, False)
    finally:
        context.close()

    log.info(
        "playwright.account.fetched",
        account_id=account_id,
        url=url,
        nav_count=len(nav_fingerprint),
    )

    fingerprint_bytes = json.dumps(nav_fingerprint, sort_keys=True).encode("utf-8")
    content_hash = hashlib.sha256(fingerprint_bytes).hexdigest()
    native_id = f"{account_id}:{content_hash[:16]}"

    previous = _load_previous_fingerprint(source_id, account_id)
    prev_set = set(previous or [])
    curr_set = set(nav_fingerprint)
    added = sorted(curr_set - prev_set)
    removed = sorted(prev_set - curr_set)

    is_baseline = previous is None
    if not is_baseline and not added:
        log.info("playwright.account.no_change", account_id=account_id, url=url)
        return (True, False)

    payload_bytes = json.dumps(
        {"navFingerprint": nav_fingerprint, "html": html, "url": url},
        sort_keys=True,
    ).encode("utf-8")
    blob_ref = blob.put(payload_bytes, "json")

    content = "(baseline website snapshot)" if is_baseline else _render_diff_content(added)
    source_meta = {
        "navFingerprint": nav_fingerprint,
        "addedItems": added,
        "removedItems": removed,
        "homepageUrl": url,
        "fetchedAt": datetime.now(UTC).isoformat(),
        "isBaseline": is_baseline,
    }

    new_id = _insert_raw_data(
        source_id=source_id,
        account_id=account_id,
        native_id=native_id,
        content=content,
        url=url,
        posted_at=datetime.now(UTC),
        payload_blob_ref=blob_ref,
        content_hash=content_hash,
        source_meta=source_meta,
    )
    if new_id is None:
        return (True, False)

    if is_baseline:
        log.info("playwright.account.baseline", account_id=account_id, raw_data_id=new_id)
        return (True, False)

    enqueue("detect", {"rawDataId": new_id})
    log.info(
        "playwright.account.diff",
        account_id=account_id,
        raw_data_id=new_id,
        added=added,
        removed=removed,
    )
    return (True, True)


def handle_scrape_website(payload: dict[str, Any]) -> None:
    source_id = int(payload["sourceId"])
    account_ids = payload.get("accountIds")

    targets = _load_targets(account_ids)
    if not targets:
        log.info("playwright.skip", reason="no active accounts with website", source_id=source_id)
        return

    log_id = _open_scrape_log(source_id)
    log.info("playwright.run", source_id=source_id, accounts=len(targets), scrape_log_id=log_id)

    processed = 0
    matched = 0
    discarded = 0

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                for account in targets:
                    try:
                        ok, diffed = _process_account(browser, source_id, account)
                    except Exception as e:
                        log.exception(
                            "playwright.account.unhandled",
                            account_id=int(account["id"]),
                            error=str(e),
                        )
                        discarded += 1
                        continue
                    if ok:
                        processed += 1
                        if diffed:
                            matched += 1
                    else:
                        discarded += 1
            finally:
                browser.close()
    except Exception as e:
        _close_scrape_log(log_id, "failed", processed, matched, discarded, error=str(e))
        raise

    _close_scrape_log(log_id, "done", processed, matched, discarded)
    _touch_source(source_id)
    log.info(
        "playwright.done",
        source_id=source_id,
        processed=processed,
        matched=matched,
        discarded=discarded,
    )


def main() -> None:
    run_loop({"scrape.website": handle_scrape_website})


if __name__ == "__main__":
    main()
