---
"@codegraphy-vscode/plugin-api": major
"@codegraphy/extension": major
---

Remove the legacy `detectConnections(...)` plugin hook and require plugin-contributed analysis to use `analyzeFile(...)` with the shared per-file analysis result shape.
