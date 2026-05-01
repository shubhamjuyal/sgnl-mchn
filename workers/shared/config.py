import os
from dataclasses import dataclass

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Config:
    database_url: str
    poll_interval_ms: int
    blob_store_path: str
    openai_api_key: str | None
    openai_detection_model: str
    log_level: str
    apify_token: str | None
    apify_instagram_actor_id: str

    @classmethod
    def from_env(cls) -> "Config":
        url = os.environ.get("WORKERS_DATABASE_URL") or os.environ.get("DATABASE_URL")
        if not url:
            raise RuntimeError("WORKERS_DATABASE_URL or DATABASE_URL must be set")
        return cls(
            database_url=url,
            poll_interval_ms=int(os.environ.get("WORKER_POLL_INTERVAL_MS", "2000")),
            blob_store_path=os.environ.get("BLOB_STORE_PATH", "./var/blobs"),
            openai_api_key=os.environ.get("OPENAI_API_KEY") or None,
            openai_detection_model=os.environ.get(
                "OPENAI_DETECTION_MODEL", "gpt-4o-mini"
            ),
            log_level=os.environ.get("LOG_LEVEL", "info"),
            apify_token=os.environ.get("APIFY_TOKEN") or None,
            apify_instagram_actor_id=os.environ.get(
                "APIFY_INSTAGRAM_ACTOR_ID", "apify/instagram-scraper"
            ),
        )


CONFIG = Config.from_env()
