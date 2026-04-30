"""Signal ID minter — atomic UPSERT on the daily counter."""
from __future__ import annotations

from datetime import datetime, timezone

from .db import get_conn


def today_stamp() -> str:
    d = datetime.now(timezone.utc)
    return d.strftime("%Y%m%d")


def mint_signal_id() -> str:
    day = today_stamp()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO signal_id_counter (day, last_n) VALUES (%s, 1)
               ON CONFLICT (day) DO UPDATE SET last_n = signal_id_counter.last_n + 1
               RETURNING last_n""",
            (day,),
        )
        row = cur.fetchone()
        n = int(row["last_n"])
    return f"SIG-{day}-{n:03d}"


def mint_draft_id() -> str:
    day = today_stamp()
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """INSERT INTO draft_id_counter (day, last_n) VALUES (%s, 1)
               ON CONFLICT (day) DO UPDATE SET last_n = draft_id_counter.last_n + 1
               RETURNING last_n""",
            (day,),
        )
        row = cur.fetchone()
        n = int(row["last_n"])
    return f"DRAFT-{day}-{n:03d}"
