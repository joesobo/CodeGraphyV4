"""API service for fetching data."""

from utils.helpers import process_data


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
