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

Graph Cache hydration now keeps baseline runtime memory smaller until symbol or plugin evidence is actually needed. In a current `main` versus PR benchmark on an evidence-rich 37 MB CodeGraphy monorepo Graph Cache, baseline runtime cache size moved from 18,583,676 serialized bytes to 10,781,465 serialized bytes: 7,802,211 bytes less, a 41.98% reduction, and 1.72x smaller. Retained symbol facts moved from 11,631 to 0 until Symbol scope is enabled. Median baseline replay in that same run moved from 343.33ms to 316.56ms: 26.77ms faster, a 7.80% reduction, though the current JSON row format means the main win is retained runtime memory rather than avoiding all row parsing.

Saved-file Graph Cache persistence now patches changed rows atomically instead of rewriting the entire Graph Cache. In the current `main` versus PR benchmark on the 18 MB CodeGraphy monorepo Graph Cache, edit persistence moved from a 25,705ms average full save to a 341ms average one-row patch: 25,364ms faster, a 98.67% reduction, and 75.47x faster. Full Re-index still replaces the complete Graph Cache, while normal file edits delete and upsert only the changed cache rows inside one transaction.
