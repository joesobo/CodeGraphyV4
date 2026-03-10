"""Main entry point for the application."""

import config
from services.api import fetch_data
from utils.helpers import process_data


def main():
    """Run the application."""
    settings = config.load_config()
    data = fetch_data(settings["api_url"])
    result = process_data(data)
    print(result)


if __name__ == "__main__":
    main()
