---
"@codegraphy-dev/plugin-markdown": patch
"@codegraphy-dev/plugin-typescript": patch
"@codegraphy-dev/plugin-godot": patch
"@codegraphy-dev/plugin-svelte": patch
"@codegraphy-dev/plugin-vue": patch
---

Declare Graph Scope capabilities from first-party plugins.

First-party plugins now use `contributeGraphScopeCapabilities(context)` so Graph Scope can show relevant plugin-owned and core controls before the current graph has matching nodes or edges.
