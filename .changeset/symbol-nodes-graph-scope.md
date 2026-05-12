---
"@codegraphy/extension": minor
"@codegraphy-vscode/plugin-api": minor
"codegraphy-godot": minor
"@codegraphy-vscode/mcp": minor
---

Add Symbol and Variable nodes to the Relationship Graph with Graph Scope controls, `contains` and `overrides` edges, scoped Legend defaults, symbol-aware exports, and richer Graph Query/MCP symbol payloads.

Default node Legend entries now use singular labels, keep their colors directly editable, and rely on Custom Legend Entries for overrides instead of separate color-enable toggles. Core symbol defaults stay intentionally broad; language-specific symbol kinds fall back to Symbol styling unless a plugin contributes its own defaults. The plugin API now documents symbol endpoint projection for `fromSymbolId` and `toSymbolId`, and the Godot plugin emits `class_name` declarations as styled symbol nodes.
