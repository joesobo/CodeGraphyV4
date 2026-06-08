---
"@codegraphy-dev/plugin-api": major
"@codegraphy-dev/core": minor
"@codegraphy-dev/extension": minor
"@codegraphy-dev/plugin-markdown": patch
"@codegraphy-dev/plugin-typescript": patch
"@codegraphy-dev/plugin-godot": patch
---

Hide impossible Graph Scope Node Type toggles for the current workspace.

Graph Scope now uses active analyzer and plugin capabilities to decide which Symbol and Variable child toggles are relevant across every indexed file in the workspace. File, Folder, and Package stay visible as structural Node Types. Symbol and Variable are shown only when they have at least one relevant child toggle.

This is a breaking plugin API change: plugins must replace `contributeEdgeTypeCapabilities(context)` with `contributeGraphScopeCapabilities(context)` and return `{ nodeTypes, edgeTypes }`.
