---
"@codegraphy-dev/core": minor
"@codegraphy-dev/extension": minor
"@codegraphy-dev/mcp": minor
---

Add Verbose Diagnostics for support and agent debugging.

In the VS Code extension, Settings > Performance now includes a **Verbose Diagnostics** toggle. It is off by default and persists to `.codegraphy/settings.json` as `verboseDiagnostics`. When enabled, CodeGraphy writes factual `[CodeGraphy]` event lines to the VS Code Developer Tools console for extension activation, webview bootstrap, analysis requests, and Graph Cache load decisions.

The Core CLI now accepts a global `--verbose` flag on every command. Verbose command diagnostics are written outside JSON stdout so status and query-style output remains parseable.

Every MCP tool now accepts `verboseDiagnostics?: boolean`. When enabled, tool results include a `diagnostics` array with factual Core Package events such as workspace status reads, indexing phases, Graph Cache state, Graph Query execution, counts, and durations. Default MCP responses stay unchanged when diagnostics are disabled.
