import logging
import re
import sys

# Sensitive patterns to scrub from logs
SENSITIVE_PATTERNS = [
    re.compile(r'(client_secret=)[^&\s]+', re.IGNORECASE),
    re.compile(r'(authorization:\s*bearer\s+)[^\s]+', re.IGNORECASE),
    re.compile(r'(token=)[^&\s]+', re.IGNORECASE),
    re.compile(r'(password=)[^&\s]+', re.IGNORECASE),
]

class SafeFormatter(logging.Formatter):
    """Logging formatter that scrubs sensitive credentials from log records."""
    def format(self, record: logging.LogRecord) -> str:
        original = super().format(record)
        sanitized = original
        for pattern in SENSITIVE_PATTERNS:
            sanitized = pattern.sub(r'\1[REDACTED]', sanitized)
        return sanitized

def setup_logging(level_name: str = "INFO") -> logging.Logger:
    level = getattr(logging, level_name.upper(), logging.INFO)
    logger = logging.getLogger("sabrina_listens")
    logger.setLevel(level)

    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = SafeFormatter(
            "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger

logger = setup_logging()
