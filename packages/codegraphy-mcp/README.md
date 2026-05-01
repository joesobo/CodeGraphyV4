# CodeGraphy MCP

`@codegraphy-vscode/mcp` installs the `codegraphy` CLI and local MCP server.

It is a lightweight agent Adapter over the CodeGraphy Core Extension. The Core Extension owns Indexing, Graph Cache access, plugin wiring, and Graph Query execution. The MCP package opens or focuses the repo in VS Code, sends Indexing or Graph Query requests, and returns the Core Extension response.

## Prerequisites

- Node `22.22.0` or newer within the supported Node 22 range.
- VS Code with the CodeGraphy extension installed.
- The VS Code `code` shell command available.
- Codex or another MCP-capable agent.

## Quick Start

```bash
npm install -g @codegraphy-vscode/mcp
codegraphy setup
codegraphy open .
codex mcp list
```

If the repo has no Graph Cache yet:

```bash
codegraphy index
```

## Commands

| Command | What It Does |
|---|---|
| `codegraphy setup` | Adds the CodeGraphy MCP entry to Codex when possible |
| `codegraphy open <repo>` | Opens or focuses a repo in VS Code and marks it active for CLI Indexing |
| `codegraphy index` | Asks the Core Extension to run Indexing for the active repo |
| `codegraphy list` | Lists locally known repos from `~/.codegraphy/registry.json` |
| `codegraphy mcp` | Starts the local stdio MCP server |

## MCP Tools

| Tool | What It Does |
|---|---|
| `codegraphy_open_repo` | Opens or focuses a repo in VS Code and establishes the active Core Extension connection |
| `codegraphy_index_repo` | Asks the Core Extension to run Indexing for the active repo |
| `codegraphy_list_nodes` | Lists graph nodes, defaulting to File Nodes |
| `codegraphy_list_edges` | Lists high-level `from` / `to` connections with grouped Edge Types |
| `codegraphy_list_relationships` | Lists detailed relationships grouped by node pair and Edge Type |
| `codegraphy_list_symbols` | Lists declarations or relationship-backed symbol evidence |
| `codegraphy_find_paths` | Finds bounded directed node paths from one exact node path to another |

Query tools require an active repo from `codegraphy_open_repo`. If the active repo has no Graph Cache, the tool response tells the agent to run `codegraphy_index_repo()`.

Broad list calls are paginated with `limit` and `offset`. The default page size is 500.

## Example Prompts

- `Use CodeGraphy to list files in this repo.`
- `Use CodeGraphy to list edges connected to packages/app/src/a.ts.`
- `Use CodeGraphy to list symbols involved in type-import relationships from packages/app/src/a.ts to packages/app/src/b.ts.`
- `Use CodeGraphy to find paths from packages/app/src/a.ts to packages/app/src/d.ts.`

For the full setup guide, Codex config snippets, query controls, and verification flow, see [docs/MCP.md](../../docs/MCP.md).
