"""An orphan file with no imports or dependents.

This file is used to test the showOrphans setting.
When showOrphans=false, this file should not appear in the graph.
"""


def standalone_function():
    """A function that nobody calls."""
    return "I'm all alone"
