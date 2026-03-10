"""Application configuration."""

DEFAULT_CONFIG = {
    "api_url": "https://api.example.com",
    "timeout": 30,
    "debug": False,
}


def load_config():
    """Load configuration settings."""
    return DEFAULT_CONFIG.copy()
