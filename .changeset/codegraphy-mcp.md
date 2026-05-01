---
"@codegraphy/extension": minor
"@codegraphy-vscode/mcp": minor
---

Add the CodeGraphy MCP package and agent workflow for querying the Relationship Graph from Codex and other MCP-capable agents.

The extension now exposes Core Extension Graph Query for agent use, including node, edge, relationship, symbol, and path reports. The MCP package opens or focuses the repo in VS Code, asks the Core Extension to run Indexing when needed, and forwards Graph Query requests instead of owning graph-cache reads itself.
