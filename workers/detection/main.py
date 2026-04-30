"""Detection worker: phrase-match raw_data against signal_dictionary,
optional LLM second-pass on borderline matches, write signal rows.

GR-01 (generic posts) is enforced here at detection time — we discard the
raw_data row outright before any signal is created.
"""
from __future__ import annotations

import json
import re
from typing import Any

from shared.bus import enqueue, run_loop
from shared.db import get_conn
from shared.log import get_logger
from shared.signal_id import mint_signal_id

log = get_logger(__name__)

# Generic-post markers that GR-01 discards. Cheap heuristic; LLM can refine later.
GENERIC_PATTERNS = [
    r"\bnew arrivals?\b",
    r"\bjust in\b",
    r"\bshop now\b",
    r"\bcheck out our\b",
]


def is_generic(content: str) -> bool:
    text = content.lower()
    if any(re.search(p, text) for p in GENERIC_PATTERNS):
        # only generic if no other strong signal phrase present — best-effort heuristic
        if not re.search(
            r"(opening|new location|new owner|under new|hiring|seeking|stack|men's|category|private label|stockout)",
            text,
        ):
            return True
    return False


def phrase_matches(content: str, phrases: list[str]) -> list[str]:
    text = content.lower()
    hits: list[str] = []
    for p in phrases:
        pat = re.escape(p.lower())
        if re.search(rf"(?i){pat}", text):
            hits.append(p)
    return hits


def handle_detect(payload: dict[str, Any]) -> None:
    raw_data_id = int(payload["rawDataId"])

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """SELECT rd.*, a.archetype, a.follower_tier, a.geographic_market, a.account_status
               FROM raw_data rd
               JOIN account a ON a.id = rd.account_id
               WHERE rd.id = %s""",
            (raw_data_id,),
        )
        rd = cur.fetchone()
        if not rd:
            log.warning("detect.skip", reason="raw_data not found", raw_data_id=raw_data_id)
            return

        # GR-08: account must be classified
        if not rd["archetype"]:
            log.info("detect.gr08", raw_data_id=raw_data_id)
            cur.execute(
                """INSERT INTO guardrail_event_log
                   (raw_data_id, rule_code, action_taken, is_blocked, details)
                   VALUES (%s, 'GR-08', 'hold', true, %s::jsonb)""",
                (raw_data_id, json.dumps({"reason": "account unclassified"})),
            )
            return

        # GR-01 discard at detection
        if is_generic(rd["content"]):
            log.info("detect.gr01", raw_data_id=raw_data_id)
            cur.execute(
                """INSERT INTO guardrail_event_log
                   (raw_data_id, rule_code, action_taken, is_blocked, details)
                   VALUES (%s, 'GR-01', 'discard', true, %s::jsonb)""",
                (raw_data_id, json.dumps({"sample": rd["content"][:120]})),
            )
            return

        # Pull active dictionary
        cur.execute(
            "SELECT code, signal_name, category, type, default_weight, example_phrases "
            "FROM signal_dictionary WHERE status = 'active' ORDER BY code"
        )
        dictionary = cur.fetchall()

    matches: list[tuple[str, str, int]] = []  # (code, matched_phrase, weight)
    for d in dictionary:
        phrases = d["example_phrases"] or []
        hits = phrase_matches(rd["content"], phrases)
        if hits:
            matches.append((d["code"], hits[0], int(d["default_weight"])))

    if not matches:
        log.info("detect.no_match", raw_data_id=raw_data_id)
        return

    # Mint signals + enqueue scoring
    new_ids: list[str] = []
    with get_conn() as conn, conn.cursor() as cur:
        for code, phrase, weight in matches:
            sig_id = mint_signal_id()
            cur.execute(
                """INSERT INTO signal (
                     signal_id, raw_data_id, account_id, source_id, signal_code,
                     matched_phrase, raw_evidence, signal_date, archetype,
                     follower_tier, geo_market, signal_strength, score_contribution,
                     confidence_tier, source_count
                   ) VALUES (
                     %(signal_id)s, %(raw_data_id)s, %(account_id)s, %(source_id)s, %(signal_code)s,
                     %(matched_phrase)s, %(raw_evidence)s, %(signal_date)s, %(archetype)s,
                     %(follower_tier)s, %(geo_market)s, %(signal_strength)s, 0.0,
                     'CANDIDATE', 1
                   )""",
                {
                    "signal_id": sig_id,
                    "raw_data_id": rd["id"],
                    "account_id": rd["account_id"],
                    "source_id": rd["source_id"],
                    "signal_code": code,
                    "matched_phrase": phrase,
                    "raw_evidence": rd["content"][:1000],
                    "signal_date": rd["posted_at"] or rd["scraped_at"],
                    "archetype": rd["archetype"],
                    "follower_tier": rd["follower_tier"],
                    "geo_market": rd["geographic_market"],
                    "signal_strength": weight,
                },
            )
            new_ids.append(sig_id)

    for sig_id in new_ids:
        enqueue("score_signal", {"signalId": sig_id})

    log.info("detect.done", raw_data_id=raw_data_id, signals=new_ids)


def main() -> None:
    run_loop({"detect": handle_detect})


if __name__ == "__main__":
    main()
