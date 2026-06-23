---
"@codegraphy-dev/extension": patch
---

Skip redundant legend group publication, deep graph reuse checks, full graph payloads, visible graph recomputation, pre-refresh legend broadcasts, incremental freshness scans, host-side graph rebuilds, static graph-state broadcasts, and blocking index metadata persistence when a saved file only changes non-visual graph node metrics. Warm one representative cached source file after Graph Cache replay so the first edit avoids cold analyzer startup, shorten normal saved-file refresh debounce while preserving file-operation coalescing, and suppress duplicate filesystem watcher refreshes that follow VS Code editor saves.
