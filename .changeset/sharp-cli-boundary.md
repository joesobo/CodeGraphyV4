---
"@codegraphy-dev/core": major
"@codegraphy-dev/mcp": major
---

Move the canonical `codegraphy` CLI into core, with explicit plugin registration through `codegraphy plugins register <package>` before local workspace enablement.

The MCP package now publishes the agent-facing `codegraphy-mcp` server command and delegates workspace indexing, status, query, and plugin behavior to core APIs. Core `codegraphy setup` now only prepares CodeGraphy's own user state and no longer configures MCP clients.
