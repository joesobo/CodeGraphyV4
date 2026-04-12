---
"@codegraphy/extension": major
"@codegraphy-vscode/plugin-api": major
"@codegraphy/plugin-markdown": major
"codegraphy-typescript": major
"codegraphy-python": major
"codegraphy-csharp": major
"codegraphy-godot": major
---

Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.
