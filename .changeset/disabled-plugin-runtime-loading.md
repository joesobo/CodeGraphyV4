---
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
---

Keep disabled plugins unloaded during Core and VS Code extension indexing so disabled package, bundled Markdown, and provided plugin runtimes are not registered or run.
