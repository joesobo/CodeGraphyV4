---
"@codegraphy-dev/plugin-api": minor
"@codegraphy-dev/core": patch
"@codegraphy-dev/extension": patch
"@codegraphy-dev/plugin-godot": patch
"@codegraphy-dev/plugin-markdown": patch
"@codegraphy-dev/plugin-particles": patch
"@codegraphy-dev/plugin-svelte": patch
"@codegraphy-dev/plugin-typescript": patch
"@codegraphy-dev/plugin-unity": patch
"@codegraphy-dev/plugin-vue": patch
---

Graph View now keeps plugin-owned evidence and symbol evidence out of runtime memory until the user enables the matching Graph Scope or plugin. If the evidence is already in Graph Cache, the first toggle hydrates it with 1 cache read, 0 analysis jobs, and 0 cache saves; later off/on toggles reuse memory with 0 additional cache reads.

On the current `main` versus PR CodeGraphy monorepo benchmark, baseline runtime cache size improved from 18,583,676 serialized bytes to 10,781,465 serialized bytes: 7,802,211 bytes less, a 41.98% reduction, and 1.72x smaller. Retained symbol facts stay at 0 until Symbol scope is enabled instead of retaining 11,631 hidden symbol facts on startup.

Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.
