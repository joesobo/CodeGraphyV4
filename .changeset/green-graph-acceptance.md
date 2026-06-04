---
"@codegraphy-dev/extension": patch
---

Fix several Graph View interaction bugs covered by the VS Code acceptance suite:

- Graph context menus now expose the expected user-facing actions for files, folders, multiple selected files, symbols, edges, and the background canvas.
- File and folder node actions use clear labels for open, reveal, copy path, favorite, filter, rename, and delete workflows, so users can reliably find the action they need from the graph.
- Graph toolbar controls are accessible to VS Code and test automation, making keyboard and screen-reader discovery more reliable.
