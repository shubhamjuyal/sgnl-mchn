"""Routing worker: applies routing_rule rows to a signal, writes routing_log
and creates outreach_draft placeholders for B2B destinations."""
from __future__ import annotations

import json
from datetime import datetime, timezone, timedelta
from typing import Any

from shared.bus import run_loop
from shared.db import get_conn
from shared.log import get_logger
from shared.signal_id import mint_draft_id

log = get_logger(__name__)

INTENT_CODES = {"V1", "V2", "V3"}
TREND_CATEGORIES = {"assortment", "demand"}


def category_kind(category: str, code: str) -> str:
    if code in INTENT_CODES:
        return "intent"
    if code.startswith("S"):
        return "intent"  # structural feeds B2B intent path per spec
    if category in TREND_CATEGORIES:
        return "trend"
    return "any"


def fetch_signal(signal_id: str) -> dict[str, Any] | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT s.*, a.geographic_market AS account_geo, a.archetype, sd.category AS dict_category
               FROM signal s
               JOIN account a ON a.id = s.account_id
               JOIN signal_dictionary sd ON sd.code = s.signal_code
               WHERE s.signal_id = %s""",
            (signal_id,),
        )
        return cur.fetchone()


def fetch_account_score(account_id: int) -> float:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT signal_score FROM account_score WHERE account_id = %s",
            (account_id,),
        )
        row = cur.fetchone()
        return float(row["signal_score"]) if row else 0.0


def fetch_routing_rules() -> list[dict[str, Any]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM routing_rule WHERE enabled = true ORDER BY priority"
        )
        return cur.fetchall()


def is_in_cooldown(account_id: int, days: int = 21) -> bool:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT 1 FROM outreach_draft
               WHERE account_id = %s
                 AND status IN ('approved', 'sent')
                 AND approved_at >= NOW() - (%s || ' days')::interval
               LIMIT 1""",
            (account_id, days),
        )
        return cur.fetchone() is not None


def match_rule(rule: dict[str, Any], sig: dict[str, Any], score: float) -> bool:
    if rule["match_tier"] != sig["confidence_tier"]:
        return False
    code = sig["signal_code"]
    category = sig["dict_category"]
    kind = category_kind(category, code)

    if rule["match_signal_category"] not in (None, "any"):
        if rule["match_signal_category"] != kind:
            return False
    if rule["match_signal_codes"]:
        codes = rule["match_signal_codes"]
        if isinstance(codes, str):
            codes = json.loads(codes)
        if code not in codes:
            return False
    if rule["score_min"] is not None and score < float(rule["score_min"]):
        return False
    if rule["score_max"] is not None and score > float(rule["score_max"]):
        return False
    return True


def fetch_program_for(archetype: str | None, code: str) -> str | None:
    if not archetype:
        return None
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT primary_program_id FROM archetype_program_mapping
               WHERE archetype_code = %s AND signal_code = %s""",
            (archetype, code),
        )
        row = cur.fetchone()
        return row["primary_program_id"] if row else None


B2B_DESTINATIONS = {
    "b2b_outreach_queue",
    "b2b_warm_queue",
    "b2b_watch_queue",
}


def handle_route(payload: dict[str, Any]) -> None:
    signal_id = payload["signalId"]
    sig = fetch_signal(signal_id)
    if not sig:
        log.warning("route.skip", signal_id=signal_id)
        return

    score = fetch_account_score(int(sig["account_id"]))
    rules = fetch_routing_rules()

    matched: list[dict[str, Any]] = [r for r in rules if match_rule(r, sig, score)]
    if not matched:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO routing_log (signal_id, tier, score, destination, blocked_reason)
                   VALUES (%s, %s, %s, 'monitor_queue', %s)""",
                (signal_id, sig["confidence_tier"], score, "no rule matched, default monitor"),
            )
        log.info("route.default_monitor", signal_id=signal_id)
        return

    geo_us_only = sig["account_geo"] == "US"

    for rule in matched:
        dest = rule["destination"]
        blocked_reason: str | None = None

        # GR-07 — non-US accounts excluded from US B2B
        if not geo_us_only and dest in B2B_DESTINATIONS:
            blocked_reason = "GR-07: non-US account"

        # GR-10 — cooldown blocks outreach
        if dest == "b2b_outreach_queue" and is_in_cooldown(int(sig["account_id"])):
            blocked_reason = "GR-10: cooldown active"

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                """INSERT INTO routing_log
                   (signal_id, tier, score, destination, routing_rule_applied, blocked_reason)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    signal_id,
                    sig["confidence_tier"],
                    score,
                    dest,
                    int(rule["id"]),
                    blocked_reason,
                ),
            )

            if blocked_reason is None and dest in B2B_DESTINATIONS:
                program_id = fetch_program_for(sig.get("archetype"), sig["signal_code"])
                draft_id = mint_draft_id()
                cur.execute(
                    """INSERT INTO outreach_draft
                       (draft_id, account_id, signal_id, program_id, channel, status, destination)
                       VALUES (%s, %s, %s, %s, %s, 'pending_human', %s)""",
                    (
                        draft_id,
                        int(sig["account_id"]),
                        signal_id,
                        program_id,
                        "email",  # TODO: pull from archetype mapping
                        dest,
                    ),
                )
                log.info(
                    "route.draft_created",
                    signal_id=signal_id,
                    draft_id=draft_id,
                    destination=dest,
                )
            else:
                log.info(
                    "route.logged",
                    signal_id=signal_id,
                    destination=dest,
                    blocked=blocked_reason,
                )


def main() -> None:
    run_loop({"route": handle_route})


if __name__ == "__main__":
    main()
