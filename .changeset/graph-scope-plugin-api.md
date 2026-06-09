---
"@codegraphy-dev/plugin-api": major
---

Replace the edge-only capability hook with Graph Scope capabilities.

Plugins must replace `contributeEdgeTypeCapabilities(context)` with `contributeGraphScopeCapabilities(context)` and return `{ nodeTypes, edgeTypes }`. Capability declarations are still independent from emitted graph records, but now cover both Node Type and Edge Type controls.
