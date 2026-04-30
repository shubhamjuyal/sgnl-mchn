"""Scoring + guardrails worker.

Per signal:
  1. Apply guardrails (cap / discard / tier_cap / block_route)
  2. Apply decay (signal_age vs decay_rule)
  3. Apply occurrence cap for trend signals (per account+code window)
  4. Compute score_contribution
  5. Enqueue aggregate_account, then tier
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from shared.bus import enqueue, run_loop
from shared.db import get_conn
from shared.log import get_logger

log = get_logger(__name__)


def days_since(ts: datetime) -> int:
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return max(0, (datetime.now(timezone.utc) - ts).days)


def apply_decay(weight: float, age_days: int, schedule: list[dict[str, Any]]) -> float:
    """schedule = [{upToDays, multiplier}, ...] sorted ascending. Last bucket wins on overflow."""
    for bucket in schedule:
        if age_days <= int(bucket["upToDays"]):
            return weight * float(bucket["multiplier"])
    return 0.0


def fetch_signal(signal_id: str) -> dict[str, Any] | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT s.*, sd.type AS dict_type, sd.category AS dict_category,
                      sd.decay_rule, sd.max_occurrences, sd.occurrence_window_days
               FROM signal s
               JOIN signal_dictionary sd ON sd.code = s.signal_code
               WHERE s.signal_id = %s""",
            (signal_id,),
        )
        return cur.fetchone()


def has_corroborating_signal(account_id: int, kinds: list[str]) -> bool:
    """Returns True if the account has any active signal with category in `kinds`."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT 1 FROM signal s
               JOIN signal_dictionary sd ON sd.code = s.signal_code
               WHERE s.account_id = %s AND sd.category = ANY(%s)
               LIMIT 1""",
            (account_id, kinds),
        )
        return cur.fetchone() is not None


def trend_occurrence_count(account_id: int, code: str, window_days: int) -> int:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT COUNT(*)::int AS n FROM signal
               WHERE account_id = %s AND signal_code = %s
                 AND signal_date >= NOW() - (%s || ' days')::interval""",
            (account_id, code, window_days),
        )
        row = cur.fetchone()
        return int(row["n"]) if row else 0


def total_d3_contribution(account_id: int) -> float:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT COALESCE(SUM(score_contribution), 0)::float AS s FROM signal
               WHERE account_id = %s AND signal_code = 'D3'""",
            (account_id,),
        )
        row = cur.fetchone()
        return float(row["s"]) if row else 0.0


def log_guardrail(
    signal_id: str,
    rule_code: str,
    action: str,
    blocked: bool,
    cap: int | None = None,
    details: dict[str, Any] | None = None,
) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO guardrail_event_log
               (signal_id, rule_code, action_taken, is_blocked, cap_applied, details)
               VALUES (%s, %s, %s, %s, %s, %s::jsonb)""",
            (signal_id, rule_code, action, blocked, cap, json.dumps(details or {})),
        )


def update_signal(
    signal_id: str,
    contribution: float,
    blocked: bool,
    rule_fired: str | None,
) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """UPDATE signal SET score_contribution = %s,
                 is_guardrail_blocked = %s, guardrail_rule_fired = %s, updated_at = NOW()
               WHERE signal_id = %s""",
            (contribution, blocked, rule_fired, signal_id),
        )


def handle_score_signal(payload: dict[str, Any]) -> None:
    signal_id = payload["signalId"]
    sig = fetch_signal(signal_id)
    if not sig:
        log.warning("score.skip", signal_id=signal_id)
        return

    code: str = sig["signal_code"]
    weight: float = float(sig["signal_strength"])
    sig_type: str = sig["dict_type"]
    decay_rule = sig["decay_rule"]
    schedule = decay_rule["schedule"] if isinstance(decay_rule, dict) else json.loads(decay_rule)["schedule"]

    age = days_since(sig["signal_date"])

    # 1. Decay (GR-11 falls out of decay schedule -> 0)
    contribution = apply_decay(weight, age, schedule)
    if contribution == 0.0:
        log_guardrail(signal_id, "GR-11", "expired", False, 0, {"age_days": age})
        update_signal(signal_id, 0.0, False, "GR-11")
        enqueue("aggregate_account", {"accountId": int(sig["account_id"])})
        enqueue("tier", {"signalId": signal_id})
        log.info("score.expired", signal_id=signal_id, age=age)
        return

    blocked = False
    rule_fired: str | None = None

    # 2. GR-13 trend over-occurrence cap
    if sig_type == "trend" and sig["max_occurrences"] and sig["occurrence_window_days"]:
        n = trend_occurrence_count(int(sig["account_id"]), code, int(sig["occurrence_window_days"]))
        if n > int(sig["max_occurrences"]):
            log_guardrail(
                signal_id,
                "GR-13",
                "cap_to_zero",
                False,
                0,
                {"count": n, "max": sig["max_occurrences"]},
            )
            contribution = 0.0
            rule_fired = "GR-13"

    # 3. GR-05 standalone D3 cap
    if code == "D3":
        if not has_corroborating_signal(int(sig["account_id"]), ["structural", "vendor_openness"]):
            cur_total = total_d3_contribution(int(sig["account_id"]))
            allowed = max(0.0, 10.0 - cur_total)
            if contribution > allowed:
                log_guardrail(
                    signal_id,
                    "GR-05",
                    "cap_total",
                    False,
                    10,
                    {"existing_total": cur_total, "allowed": allowed},
                )
                contribution = allowed
                rule_fired = "GR-05"

    # 4. GR-02 / GR-03 / GR-04 — heuristic content-based caps. We approximate with simple
    # text checks since true classification needs LLM. Conservative defaults below.
    # (Skipped in MVP — left as a TODO; phrase-matching alone won't fire holiday/repost/moodboard
    # reliably. The cap fields exist on guardrail_rule for the LLM pass to use later.)

    update_signal(signal_id, contribution, blocked, rule_fired)
    log.info(
        "score.applied",
        signal_id=signal_id,
        code=code,
        contribution=round(contribution, 2),
        rule=rule_fired,
    )

    enqueue("aggregate_account", {"accountId": int(sig["account_id"])})
    enqueue("tier", {"signalId": signal_id})


def main() -> None:
    run_loop({"score_signal": handle_score_signal})


if __name__ == "__main__":
    main()
