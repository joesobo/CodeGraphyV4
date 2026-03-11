"""Helper utilities."""

from utils.format import format_output


def process_data(data):
    """Process raw data into formatted output."""
    if not data:
        return format_output("No data")
    
    processed = [item.upper() for item in data]
    return format_output(", ".join(processed))
