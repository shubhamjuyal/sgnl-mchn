import logging
import sys

import structlog

from .config import CONFIG

logging.basicConfig(
    format="%(message)s",
    stream=sys.stdout,
    level=getattr(logging, CONFIG.log_level.upper(), logging.INFO),
)

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        getattr(logging, CONFIG.log_level.upper(), logging.INFO)
    ),
    cache_logger_on_first_use=True,
)


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    return structlog.get_logger(name)
