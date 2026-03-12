"""Examples for from-import member resolution behavior."""

from services import api
from utils import helpers
from requests import Session


def use_members() -> dict[str, str]:
    """Touch imported members to avoid unused import lint noise."""
    _ = Session
    return {
        "service": api.fetch_data.__name__,
        "helper": helpers.process_data.__name__,
    }
