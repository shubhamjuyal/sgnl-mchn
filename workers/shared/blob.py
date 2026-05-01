"""Disk-backed content-addressable blob store. Mirrors packages/blob/src/index.ts."""
from __future__ import annotations

import hashlib
from pathlib import Path

from .config import CONFIG


def put(payload: bytes, ext: str = "bin") -> str:
    digest = hashlib.sha256(payload).hexdigest()
    ref = f"{digest[0:2]}/{digest[2:4]}/{digest}.{ext}"
    path = Path(CONFIG.blob_store_path) / ref
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(payload)
    return ref


def get(ref: str) -> bytes:
    return (Path(CONFIG.blob_store_path) / ref).read_bytes()
