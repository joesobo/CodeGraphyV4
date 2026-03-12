# Python Plugin

Detects Python file-to-file dependencies from import statements.

## Supported Extensions

`.py`, `.pyi`

## Rules

| Rule | Description |
|------|-------------|
| Standard Imports | `import x`, `import x.y`, `import x as y`, `import a, b` |
| From Imports | `from x import y`, `from . import y`, `from ..pkg import y` |

## Resolution Behavior

- Relative imports (`.`, `..`, `...`) resolve from the importing file's directory.
- Absolute imports resolve from:
  - workspace root
  - project source roots discovered from `pyproject.toml` / `setup.cfg`
  - common Python roots: `src`, `lib`, `app`
- For `from pkg import mod`, the plugin tries `pkg.mod` first, then falls back to `pkg`.
- Local namespace packages (no `__init__.py`) are supported when imported members map to real files.
- `.pyi` stubs are considered during path resolution.

## Graph Behavior

- Only local file-to-file edges are shown.
- Unresolved/third-party imports (for example `from requests import Session`) remain unresolved and are not turned into graph edges.
