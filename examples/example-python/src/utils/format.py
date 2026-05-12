"""Formatting utilities."""


def format_output(text):
    """Format text for display."""
    return f"[OUTPUT] {text}"


def format_name(name):
    """Format a display name for user-facing output."""
    return name.strip().title()


def format_error(message):
    """Format error message."""
    return f"[ERROR] {message}"
