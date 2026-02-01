# Python Plugin Test Fixture

A mini Python project with predictable import patterns for testing CodeGraphy's Python plugin.

## Structure

```
src/
├── main.py           # Entry point
├── config.py         # Configuration
├── orphan.py         # No connections (test showOrphans)
├── utils/
│   ├── __init__.py
│   ├── helpers.py    # Utility functions
│   └── format.py     # Formatting utilities
└── services/
    ├── __init__.py
    └── api.py        # API service
```

## Expected Graph Structure

```
main.py ────┬──▶ config.py
            │
            ├──▶ services/api.py ──▶ utils/helpers.py ──▶ utils/format.py
            │
            └──▶ utils/helpers.py

orphan.py (no connections - only visible with showOrphans=true)
```

## Import Patterns Tested

| Pattern | Example | File |
|---------|---------|------|
| Relative import | `from .helpers import ...` | api.py |
| Absolute import | `from src.config import ...` | main.py |
| Simple import | `import config` | main.py |
| From import | `from utils.format import ...` | helpers.py |

## Files

| File | Imports From | Imported By |
|------|--------------|-------------|
| `main.py` | config, api, helpers | — |
| `config.py` | — | main |
| `orphan.py` | — | — |
| `utils/helpers.py` | format | main, api |
| `utils/format.py` | — | helpers |
| `services/api.py` | helpers | main |

## How to Test

1. Open CodeGraphy repo in VSCode
2. Press F5 to launch Extension Development Host
3. In the new window: **File → Open Folder → examples/python-plugin**
4. Click the CodeGraphy icon in the activity bar
5. Compare the graph to the expected structure above
