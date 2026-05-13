"""Main entry point for the application."""

import config
from services.api import fetch_user
from utils.helpers import summarize_user


def main():
    """Run the application."""
    settings = config.load_config()
    user = fetch_user(settings["api_url"])
    result = summarize_user(user)
    print(result)


if __name__ == "__main__":
    main()
