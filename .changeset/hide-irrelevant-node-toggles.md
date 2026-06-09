---
"@codegraphy-dev/core": minor
"@codegraphy-dev/extension": minor
---

Hide impossible Graph Scope Node Type toggles for the current workspace.

Graph Scope now uses active analyzer and plugin capabilities to decide which Symbol and Variable child toggles are relevant across every indexed file in the workspace. File, Folder, and Package stay visible as structural Node Types. Symbol and Variable are shown only when they have at least one relevant child toggle.
