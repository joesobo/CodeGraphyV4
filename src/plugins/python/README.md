# Python Plugin

Detects import relationships in Python files using regex-based parsing with multi-line import support.

## Supported Extensions

`.py` `.pyi`

## Rules

| Rule | Description |
|------|-------------|
| Standard Imports | `import os`, `import os.path`, `import x as y` |
| From Imports | `from os import path`, `from . import utils`, `from ..config import settings` |

## Path Resolution

- Relative imports (`.`, `..`, `...`) resolved from importing file's directory
- Absolute imports searched in workspace root and common source directories (`src`, `lib`, `app`)
- Package imports resolved via `__init__.py`
- Type stub support (`.pyi` files)
