"""Playwright worker (STUB).

Real flow when wired:
  1. handle_scrape_website(payload) iterates accounts with a website handle
  2. For each: launch Playwright browser, fetch homepage + nav HTML
  3. Compute a simple structural fingerprint (nav anchor texts, category links, sitemap diff)
  4. Compare against last raw_data row for that (source_id, account_id)
  5. If changed: write new raw_data row + enqueue 'detect'

For MVP, this is a stub that logs the payload.
"""
from __future__ import annotations

from typing import Any

from shared.bus import run_loop
from shared.log import get_logger

log = get_logger(__name__)


def handle_scrape_website(payload: dict[str, Any]) -> None:
    log.info("playwright.run", payload=payload)
    # TODO: implement Playwright fetch + diff per registered site


def main() -> None:
    run_loop({"scrape.website": handle_scrape_website})


if __name__ == "__main__":
    main()
