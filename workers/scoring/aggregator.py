"""Account aggregator: roll up signal contributions into account_score."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from shared.bus import run_loop
from shared.db import get_conn
from shared.log import get_logger

log = get_logger(__name__)


def fetch_scoring_config() -> dict[str, Any]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM scoring_config WHERE active = true ORDER BY id LIMIT 1"
        )
        row = cur.fetchone()
        return row or {
            "lookback_window_days": 90,
            "freshness_window_days": 7,
            "max_possible_score": 100,
        }


def handle_aggregate(payload: dict[str, Any]) -> None:
    account_id = int(payload["accountId"])
    cfg = fetch_scoring_config()
    lookback = int(cfg["lookback_window_days"])
    fresh_days = int(cfg["freshness_window_days"])
    max_possible = float(cfg["max_possible_score"] or 100)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT signal_id, signal_code, score_contribution, signal_date, confidence_tier
               FROM signal
               WHERE account_id = %s
                 AND signal_date >= NOW() - (%s || ' days')::interval
                 AND is_guardrail_blocked = false""",
            (account_id, lookback),
        )
        rows = cur.fetchall()

    raw_score = sum(float(r["score_contribution"]) for r in rows)
    normalized = min(100.0, raw_score / max_possible * 100.0)

    last_signal_at = None
    if rows:
        last_signal_at = max(r["signal_date"] for r in rows)
    is_fresh = bool(
        last_signal_at
        and (datetime.now(timezone.utc) - (
            last_signal_at if last_signal_at.tzinfo else last_signal_at.replace(tzinfo=timezone.utc)
        )).days
        <= fresh_days
    )

    tier_order = {"CANDIDATE": 0, "VALIDATED": 1, "CONFIRMED": 2, "EXPIRED": -1}
    highest = "CANDIDATE"
    for r in rows:
        if tier_order.get(r["confidence_tier"], 0) > tier_order.get(highest, 0):
            highest = r["confidence_tier"]

    top = sorted(rows, key=lambda r: -float(r["score_contribution"]))[:5]
    top_signals = [
        {
            "signalId": r["signal_id"],
            "signalCode": r["signal_code"],
            "contribution": float(r["score_contribution"]),
        }
        for r in top
    ]

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO account_score (
                 account_id, signal_score, raw_signal_score, highest_tier, top_signals,
                 signals_counted, last_signal_at, is_fresh, last_updated_at
               ) VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s, NOW())
               ON CONFLICT (account_id) DO UPDATE SET
                 signal_score = EXCLUDED.signal_score,
                 raw_signal_score = EXCLUDED.raw_signal_score,
                 highest_tier = EXCLUDED.highest_tier,
                 top_signals = EXCLUDED.top_signals,
                 signals_counted = EXCLUDED.signals_counted,
                 last_signal_at = EXCLUDED.last_signal_at,
                 is_fresh = EXCLUDED.is_fresh,
                 last_updated_at = NOW()""",
            (
                account_id,
                normalized,
                raw_score,
                highest,
                json.dumps(top_signals),
                len(rows),
                last_signal_at,
                is_fresh,
            ),
        )

    log.info(
        "aggregate.done",
        account_id=account_id,
        score=round(normalized, 1),
        signals=len(rows),
        tier=highest,
    )


def main() -> None:
    run_loop({"aggregate_account": handle_aggregate})


if __name__ == "__main__":
    main()
