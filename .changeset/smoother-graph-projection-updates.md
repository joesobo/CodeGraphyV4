---
"@codegraphy-dev/extension": patch
---

Filters, Graph Scope rows, node and edge visibility, node colors, visual plugin settings, and plugin disable toggles now update the live graph without scheduling Graph Cache saves or index work.

Deterministic scheduler tests cover 10-action projection bursts with 0 graph jobs and analyzer plugin setting bursts coalescing to 1 targeted plugin-file refresh, so rapid UI changes no longer stack repeated save progress bars.
