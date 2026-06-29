---
"@codegraphy-dev/extension": patch
---

Fix fresh workspace startup in the CodeGraphy sidebar so opening the graph requests initial workspace discovery immediately. Non-indexed workspaces can show useful file and folder structure before the user runs Index Workspace, while explicit indexing still adds relationship edges and writes the Graph Cache.
