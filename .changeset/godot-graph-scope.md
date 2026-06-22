---
"@codegraphy-dev/core": minor
"@codegraphy-dev/plugin-godot": minor
"@codegraphy-dev/extension": minor
---

Expand Godot graph support with Scene, Resource, Autoload, Scene Node, Signal, Exported Property, Signal Connections, and plain variable Graph Scope coverage backed by the runnable Godot example. Signal Connections now link declared GDScript signals without showing false self-connections for built-in engine signals, and incremental indexing refreshes those links when receiver scripts change. Exported Property nodes now cover both inline and standalone `@export` declarations.

File-only Graph Scope views now keep relationships whose hidden symbol endpoints live in visible files, so Godot Loads edges remain complete when Resource nodes are hidden.
