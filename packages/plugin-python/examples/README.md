# Python Plugin Test Fixture

A mini Python project with predictable import patterns for testing CodeGraphy's Python plugin.

## Structure

```
src/
├── main.py           # Entry point
├── member_imports.py # from pkg import member + unresolved external example
├── namespace_consumer.py
├── config.py         # Configuration
├── orphan.py         # No connections (test showOrphans)
├── ns_pkg/
│   └── member.py     # Namespace package module (no __init__.py)
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
main.py ──────────────▶ config.py
main.py ──────────────▶ services/api.py ──▶ utils/helpers.py ──▶ utils/format.py
main.py ──────────────▶ utils/helpers.py
member_imports.py ───▶ services/api.py
member_imports.py ───▶ utils/helpers.py
namespace_consumer.py ─▶ ns_pkg/member.py

orphan.py (no connections - only visible with showOrphans=true)
```

## Import Patterns Tested

| Pattern | Example | File |
|---------|---------|------|
| Relative import | `from .helpers import ...` | api.py |
| Member import | `from services import api` | member_imports.py |
| Simple import | `import config` | main.py |
| From import | `from utils.format import ...` | helpers.py |
| Namespace package | `from ns_pkg import member` | namespace_consumer.py |
| External unresolved | `from requests import Session` | member_imports.py |

## Files

| File | Imports From | Imported By |
|------|--------------|-------------|
| `main.py` | config, api, helpers | — |
| `member_imports.py` | services/api.py, utils/helpers.py, requests (unresolved) | — |
| `namespace_consumer.py` | ns_pkg/member.py | — |
| `config.py` | — | main |
| `orphan.py` | — | — |
| `ns_pkg/member.py` | — | namespace_consumer |
| `utils/helpers.py` | format | main, api |
| `utils/format.py` | — | helpers |
| `services/api.py` | helpers | main |

## How to Test

1. Open CodeGraphy repo in VSCode
2. Press F5 to launch Extension Development Host
3. In the new window: **File → Open Folder → examples/python-plugin**
4. Click the CodeGraphy icon in the activity bar
5. Compare the graph to the expected structure above
