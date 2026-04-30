"""Thin Postgres wrapper. Connection-per-job pattern for simplicity."""
from __future__ import annotations

import contextlib
from collections.abc import Iterator
from typing import Any

import psycopg
from psycopg.rows import dict_row

from .config import CONFIG


@contextlib.contextmanager
def get_conn() -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(CONFIG.database_url, row_factory=dict_row, autocommit=False)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def fetchone(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any] | None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()


def fetchall(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()


def execute(sql: str, params: tuple[Any, ...] = ()) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
