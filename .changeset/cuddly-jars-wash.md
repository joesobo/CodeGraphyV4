---
"@codegraphy/extension": patch
"@codegraphy-vscode/mcp": minor
---

Add the `@codegraphy-vscode/mcp` package with the `codegraphy` CLI and local MCP server for querying saved `.codegraphy` graph data from Codex and other MCP-capable agents.

The MCP can list/select repos, check setup status, query file and symbol relationships, inspect impact sets, and project saved graph views including depth, folder, and package nodes.

Improve CodeGraphy relation indexing so saved graph data preserves symbol targets for resolvable imports and calls instead of only file-level links.
