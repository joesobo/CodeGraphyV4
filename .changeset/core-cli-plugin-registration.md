---
"@codegraphy-dev/core": major
"@codegraphy-dev/mcp": major
---

Move the canonical `codegraphy` CLI into `@codegraphy-dev/core`. Plugin packages now use an explicit `codegraphy plugins register <package>` step before workspace-local enablement, and refresh-style plugin scanning has been removed from the supported flow.

The MCP package now publishes only the agent-facing `codegraphy-mcp` server command and mirrors core indexing, status, query, and plugin behavior through core APIs. Core `codegraphy setup` now only prepares CodeGraphy's own user state and no longer configures MCP clients.
