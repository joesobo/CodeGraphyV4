# CodeGraphy MCP

`@codegraphy/mcp` installs the `codegraphy` CLI and local MCP server.

It is a lightweight agent adapter over `@codegraphy/core`. MCP and CLI commands run against a CodeGraphy Workspace, which is the current folder by default or an explicit path when one is provided. The package can run Indexing, read workspace status, and execute Graph Query without opening or focusing VS Code.

## Prerequisites

- Node `22.22.0` or newer within the supported Node 22 range.
- Codex or another MCP-capable agent.

## Quick Start

```bash
npm install -g @codegraphy/mcp
codegraphy setup
codegraphy index
codegraphy status
codex mcp list
```

To index a different CodeGraphy Workspace:

```bash
codegraphy index /absolute/path/to/folder
```

## Commands

| Command | What It Does |
|---|---|
| `codegraphy setup` | Adds the CodeGraphy MCP entry to Codex when possible |
| `codegraphy status [workspace]` | Reports Graph Cache state, stale reasons, and enabled plugins for the current or explicit CodeGraphy Workspace |
| `codegraphy index [workspace]` | Runs Indexing for the current or explicit CodeGraphy Workspace |
| `codegraphy plugins refresh` | Scans global npm roots for installed `@codegraphy/*` plugin packages and updates `~/.codegraphy/plugins.json` |
| `codegraphy plugins add <package>` | Adds one explicitly named globally installed plugin package to `~/.codegraphy/plugins.json` |
| `codegraphy plugins list [workspace]` | Shows installed plugins and which ones are enabled for a CodeGraphy Workspace |
| `codegraphy plugins enable <package> [workspace]` | Enables a cached plugin package for the current or explicit CodeGraphy Workspace |
| `codegraphy plugins disable <package> [workspace]` | Removes a plugin package from the workspace-local enabled plugin array |
| `codegraphy list` | Lists legacy locally known repos from `~/.codegraphy/registry.json` |
| `codegraphy open <repo>` | Legacy registry command for opening a repo in VS Code |
| `codegraphy mcp` | Starts the local stdio MCP server |

Plugin commands use `@codegraphy/core` directly and do not import plugin runtime code. Installing a plugin package only makes it available; enabling it writes the workspace-local `plugins` array and tells the user to run Indexing explicitly.

## MCP Tools

| Tool | What It Does |
|---|---|
| `codegraphy_status` | Reports CodeGraphy Workspace status for the MCP server working directory or an explicit `path` |
| `codegraphy_index` | Runs Indexing for the MCP server working directory or an explicit `path` without focusing VS Code |
| `codegraphy_list_nodes` | Lists graph nodes, defaulting to File Nodes; accepts optional `path` |
| `codegraphy_list_edges` | Lists high-level `from` / `to` connections with grouped Edge Types; accepts optional `path` |
| `codegraphy_list_relationships` | Lists detailed relationships grouped by node pair and Edge Type; accepts optional `path` |
| `codegraphy_list_symbols` | Lists declarations or relationship-backed symbol evidence; accepts optional `path` |
| `codegraphy_find_paths` | Finds bounded directed node paths from one exact node path to another; accepts optional `path` |

Query tools do not require a prior open/select call. If the CodeGraphy Workspace has no Graph Cache, the tool response tells the agent to run `codegraphy_index`, then retry.

Broad list calls are paginated with `limit` and `offset`. The default page size is 500.

## Example Prompts

- `Use CodeGraphy to list files in this repo.`
- `Use CodeGraphy to list edges connected to packages/app/src/a.ts.`
- `Use CodeGraphy to list symbols involved in type-import relationships from packages/app/src/a.ts to packages/app/src/b.ts.`
- `Use CodeGraphy to find paths from packages/app/src/a.ts to packages/app/src/d.ts.`

For the full setup guide, Codex config snippets, query controls, and verification flow, see [docs/MCP.md](../../docs/MCP.md).
