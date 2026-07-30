# `@codegraphy-dev/mcp`

Optional local MCP server for CodeGraphy. It exposes the existing Core Indexing and exploration operations as discoverable structured tools. It does not own Indexing, Graph Query logic, or a second semantic interface.

## When MCP adds value

Use MCP when the agent client supports MCP and you want:

- tool discovery without teaching the client shell commands;
- input validation from tool schemas before Core runs;
- structured responses without parsing shell output;
- one persistent stdio connection for repeated calls;
- explicit Graph Cache freshness and result completeness metadata on every response.

Use the CodeGraphy Agent Skill plus the Core CLI when the agent already has a shell, needs the complete CLI surface, or should choose its workflow from generalized instructions. The skill plus CLI has fewer installed packages and is easier to debug from a terminal. MCP adds client integration, not new analysis.

## Install

```bash
npm install --global @codegraphy-dev/mcp
```

Configure an MCP client to launch:

```text
codegraphy-mcp
```

The command uses its current working directory as the CodeGraphy Workspace. Each tool also accepts an absolute `workspacePath`.

## Tools

| Tool | Existing Core operation |
|---|---|
| `codegraphy_status` | `codegraphy status` |
| `codegraphy_index` | `codegraphy index` |
| `codegraphy_search` | `codegraphy search` |
| `codegraphy_map` | `codegraphy map` |
| `codegraphy_query` | `codegraphy query` |
| `codegraphy_nodes` | `codegraphy nodes` |
| `codegraphy_edges` | `codegraphy edges` |
| `codegraphy_dependencies` | `codegraphy dependencies` |
| `codegraphy_dependents` | `codegraphy dependents` |
| `codegraphy_path` | `codegraphy path` |

Read-only tools never perform Indexing. `codegraphy_index` is the only tool in this package that writes the Graph Cache. Every tool returns the Core workspace command envelope as text and structured content.

The response `metadata.cache` field reports fresh, stale, or missing cache state and its stale reasons. `metadata.result` reports whether paging, traversal, file-budget, or source limits truncated the result.
