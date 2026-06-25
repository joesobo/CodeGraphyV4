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

Graph View now separates plugin and projection changes from Graph Cache work more aggressively. Filters, node visibility, edge visibility, node colors, visual plugin settings, and plugin disable toggles update the live graph state without scheduling cache saves or index work.

Plugin metadata now declares whether toggles and plugin-owned settings are visual-only, projection-only, plugin-file analysis, or full-index changes. Built-in plugins provide those declarations as examples for plugin authors. Deterministic scheduler tests verify that a 10-action node/edge visibility burst schedules 0 graph jobs, settings-only plugin data schedules 0 graph jobs, and a 10-action analyzer plugin setting burst coalesces to 1 plugin-file refresh.

Cached Graph Scope and plugin-owned evidence tiers are also reused from runtime memory after the first successful hydration. Toggling a cached symbol tier or enabling a cached analyzer plugin reads Graph Cache once with 0 analysis jobs and 0 cache saves. Later off/on toggles reuse the hydrated tier with 0 additional cache reads until an explicit Re-index resets runtime hydration state. If Graph Cache does not contain the requested tier, CodeGraphy falls back to the targeted analysis lane instead of incorrectly treating file-only cache data as a complete graph.
