"""Apify worker (STUB).

Real flow when wired:
  1. handle_scrape_instagram(payload) reads the source row + accounts list
  2. Builds Apify actor input (handles from account.handles.instagram)
  3. Triggers the actor via apify-client
  4. On completion, downloads the dataset
  5. For each post: writes raw_data row + enqueues 'detect'

For MVP, this just logs the payload and exits. The pipeline is still
fully exercised via the manual-entry path.
"""
from __future__ import annotations

import os
from typing import Any

from shared.bus import run_loop
from shared.log import get_logger

log = get_logger(__name__)


def handle_scrape_instagram(payload: dict[str, Any]) -> None:
    if not os.environ.get("APIFY_TOKEN"):
        log.info("apify.skip", reason="APIFY_TOKEN not configured", payload=payload)
        return

    log.info("apify.run", payload=payload)
    # TODO: integrate apify-client
    #   from apify_client import ApifyClient
    #   client = ApifyClient(os.environ["APIFY_TOKEN"])
    #   actor = client.actor(os.environ["APIFY_INSTAGRAM_ACTOR_ID"])
    #   run = actor.call(run_input={"directUrls": [...handles]})
    #   for item in client.dataset(run["defaultDatasetId"]).iterate_items():
    #       insert raw_data, enqueue detect


def main() -> None:
    run_loop({"scrape.instagram": handle_scrape_instagram})


if __name__ == "__main__":
    main()
