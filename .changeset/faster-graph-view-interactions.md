---
"@codegraphy-dev/extension": patch
---

Graph View interactions now stay responsive on large workspaces. In the VS Code benchmark, toggling the Imports Graph Scope row improved from a 2,983ms median to 188ms wall clock: 2,795ms faster, a 93.70% reduction, and 15.87x faster. The browser-visible update path measured 54ms.

Warm Graph View startup improved from 9,917ms to 4,614ms: 5,303ms faster, a 53.47% reduction, and 2.15x faster. The latest startup split shows CodeGraphy sends the first graph payload at 1,041ms, then spends most remaining first-ready time in VS Code view and webview frame readiness rather than graph work.

Saved-file updates now stay incremental after the graph has loaded. In the editor-save benchmark, the post-save path measured 39ms from saved-document receipt to request start and 140ms to request completion.
