"""Helper utilities."""

from utils.format import format_name, format_output


def process_data(data):
    """Process raw data into formatted output."""
    if not data:
        return format_output("No data")
    
    processed = [item.upper() for item in data]
    return format_output(", ".join(processed))


def summarize_user(user):
    """Summarize an API user for the command-line entry point."""
    return format_output(format_name(user.name))
