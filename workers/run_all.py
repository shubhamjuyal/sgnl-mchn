"""Single-process worker that handles every job type.
Convenient for local dev. In production, run each module on its own process."""
from __future__ import annotations

from shared.bus import run_loop
from detection.main import handle_detect
from scoring.main import handle_score_signal
from scoring.aggregator import handle_aggregate
from scoring.tier import handle_tier
from routing.main import handle_route
from apify_worker.main import handle_scrape_instagram
from playwright_worker.main import handle_scrape_website


def main() -> None:
    run_loop(
        {
            "detect": handle_detect,
            "score_signal": handle_score_signal,
            "aggregate_account": handle_aggregate,
            "tier": handle_tier,
            "route": handle_route,
            "scrape.instagram": handle_scrape_instagram,
            "scrape.website": handle_scrape_website,
        }
    )


if __name__ == "__main__":
    main()
