---
"@codegraphy/extension": minor
"@codegraphy-vscode/mcp": minor
---

Add the CodeGraphy MCP package and agent workflow for querying saved `.codegraphy` graph data from Codex and other MCP-capable agents.

The extension now writes richer saved graph data for agent use, including symbol-aware TypeScript type/import/call relationships, improved impact filtering, repo freshness metadata, saved depth/folder/package view projections, and VS Code-owned reindex requests. Normal saved file changes refresh the saved DB through the extension; stale status is used when the saved graph appears missing or behind the repo state.
