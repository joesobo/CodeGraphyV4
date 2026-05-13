"""API service for fetching data."""

from utils.helpers import process_data


class ApiUser:
    """A tiny API user record returned by the service."""

    def __init__(self, name):
        self.name = name


def fetch_data(url):
    """Fetch data from the API.
    
    This is a mock implementation for testing.
    """
    # In real code, this would make HTTP requests
    mock_data = ["apple", "banana", "cherry"]
    return mock_data


def post_data(url, payload):
    """Post data to the API."""
    return {"status": "ok", "url": url}


def fetch_user(url):
    """Fetch one user and process a display label for the app."""
    names = fetch_data(url)
    label = process_data(names[:1])
    return ApiUser(label)
