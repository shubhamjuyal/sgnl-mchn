"""Tier worker: assigns CANDIDATE / VALIDATED / CONFIRMED.

Source count = distinct sources that produced this account+code combo.
Velocity = optional in MVP per HLD (require_velocity=false by default).
"""
from __future__ import annotations

from typing import Any

from shared.bus import enqueue, run_loop
from shared.db import get_conn
from shared.log import get_logger

log = get_logger(__name__)


def fetch_tier_rule() -> dict[str, Any]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT * FROM confidence_tier_rule WHERE active = true ORDER BY id LIMIT 1"
        )
        row = cur.fetchone()
        if not row:
            raise RuntimeError("no active confidence_tier_rule")
        return row


def fetch_signal(signal_id: str) -> dict[str, Any] | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT s.*, sd.category AS dict_category, sd.type AS dict_type
               FROM signal s JOIN signal_dictionary sd ON sd.code = s.signal_code
               WHERE s.signal_id = %s""",
            (signal_id,),
        )
        return cur.fetchone()


def count_distinct_sources(account_id: int, code: str) -> int:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT COUNT(DISTINCT source_id)::int AS n FROM signal
               WHERE account_id = %s AND signal_code = %s""",
            (account_id, code),
        )
        row = cur.fetchone()
        return int(row["n"]) if row else 0


def velocity_present(signal_row: dict[str, Any], velocity_sources: list[str]) -> bool:
    return bool(signal_row.get("velocity_source")) and signal_row["velocity_source"] in velocity_sources


def compute_tier(
    sig: dict[str, Any], rule: dict[str, Any], source_count: int
) -> str:
    score = float(sig["score_contribution"])
    code = sig["signal_code"]

    # GR-14 — D1/D3 without velocity stay CANDIDATE
    if code in ("D1", "D3") and not velocity_present(sig, rule["velocity_sources"]):
        return "CANDIDATE"

    # GR-06 — single source caps at CANDIDATE
    if source_count < int(rule["validated_min_sources"]):
        # alternate VALIDATED rule: 1 high-weight V signal with score >= threshold
        if (
            code in rule["validated_alternate_signal_codes"]
            and score >= float(rule["validated_alternate_min_score"])
        ):
            return "VALIDATED"
        return "CANDIDATE"

    # CONFIRMED?
    if source_count >= int(rule["confirmed_min_sources"]):
        if rule["require_velocity"] and not velocity_present(sig, rule["velocity_sources"]):
            return "VALIDATED"
        return "CONFIRMED"

    return "VALIDATED"


def handle_tier(payload: dict[str, Any]) -> None:
    signal_id = payload["signalId"]
    sig = fetch_signal(signal_id)
    if not sig:
        log.warning("tier.skip", signal_id=signal_id)
        return

    rule = fetch_tier_rule()
    sources = count_distinct_sources(int(sig["account_id"]), sig["signal_code"])
    new_tier = compute_tier(sig, rule, sources)
    previous = sig["confidence_tier"]
    confidence_score = min(1.0, sources / float(rule["confirmed_min_sources"]))

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """UPDATE signal SET confidence_tier = %s, confidence_score = %s,
                 source_count = %s, updated_at = NOW()
               WHERE signal_id = %s""",
            (new_tier, confidence_score, sources, signal_id),
        )
        if previous != new_tier:
            cur.execute(
                """INSERT INTO tier_promotion_log
                   (signal_id, previous_tier, new_tier, source_count,
                    velocity_confirmed, velocity_source)
                   VALUES (%s, %s, %s, %s, %s, %s)""",
                (
                    signal_id,
                    previous,
                    new_tier,
                    sources,
                    velocity_present(sig, rule["velocity_sources"]),
                    sig.get("velocity_source"),
                ),
            )

    enqueue("route", {"signalId": signal_id})
    log.info(
        "tier.assigned",
        signal_id=signal_id,
        from_tier=previous,
        to_tier=new_tier,
        sources=sources,
    )


def main() -> None:
    run_loop({"tier": handle_tier})


if __name__ == "__main__":
    main()
