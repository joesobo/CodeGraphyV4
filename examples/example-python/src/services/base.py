"""Base API service records."""


class BaseApiUser:
    """Shared API user shape."""

    def __init__(self, name):
        self.name = name
