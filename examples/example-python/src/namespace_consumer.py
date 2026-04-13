"""Consume a namespace package module (no __init__.py required)."""

from ns_pkg import member


def run() -> str:
    return member.describe()
