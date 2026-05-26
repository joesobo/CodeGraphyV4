# CodeGraphy MCP

`@codegraphy-dev/mcp` exposes the optional local MCP server.

It is the agent interface over `@codegraphy-dev/core`. The terminal `codegraphy` command belongs to the Core Package npm package; MCP depends on Core and reuses core behavior so agents can run Indexing, read workspace status, and execute Graph Query without opening or focusing VS Code.

The MCP package owns the agent-agnostic `codegraphy-mcp` server command. Configure Codex, Claude, Cursor, or another MCP-capable agent to launch that command. Core does not know about MCP clients.

## Prerequisites

- Node `22.22.0` or newer within the supported Node 22 range.
- Codex, Claude, Cursor, or another MCP-capable agent.

## Quick Start

```bash
npm install -g @codegraphy-dev/mcp
```

To index a different CodeGraphy Workspace, call the MCP `codegraphy_index` tool with `path`, or install `@codegraphy-dev/core` globally and run:

```bash
npm install -g @codegraphy-dev/core
codegraphy index /absolute/path/to/folder
```

## Commands

| Command | What It Does |
|---|---|
| `codegraphy status [workspace]` | Reports Graph Cache state, stale reasons, and enabled plugins for the current or explicit CodeGraphy Workspace |
| `codegraphy index [workspace]` | Runs Indexing for the current or explicit CodeGraphy Workspace |
| `codegraphy plugins register <package>` | Registers one globally installed plugin package in the user-level Plugin Registry after validating its CodeGraphy metadata |
| `codegraphy plugins list [workspace]` | Shows installed plugins and which ones are enabled for a CodeGraphy Workspace |
| `codegraphy plugins enable <package> [workspace]` | Enables a registered plugin package for the current or explicit CodeGraphy Workspace |
| `codegraphy plugins disable <package> [workspace]` | Removes a plugin package from the workspace-local enabled plugin array |
| `codegraphy-mcp` | Starts the local stdio MCP server for agent clients |

Plugin commands use `@codegraphy-dev/core` directly and do not import plugin runtime code. Installing and registering a plugin package only makes it available; enabling it writes the workspace-local `plugins` array and tells the user to run Indexing explicitly.

For commands with `[workspace]`, the workspace is an optional trailing positional argument. Omitting the path targets the process current working directory exactly. CodeGraphy does not walk upward to find a parent repo or existing `.codegraphy` folder.

## MCP Tools

MCP tools mirror the core CLI command semantics. They call Core APIs directly instead of shelling out to `codegraphy`.

| Tool | What It Does |
|---|---|
| `codegraphy_status` | Reports CodeGraphy Workspace status for the MCP server working directory or an explicit `path` |
| `codegraphy_index` | Runs Indexing for the MCP server working directory or an explicit `path` without focusing VS Code |
| `codegraphy_plugins_register` | Registers one globally installed plugin package in the user-level Plugin Registry after validating its CodeGraphy metadata |
| `codegraphy_plugins_list` | Shows registered plugins and which ones are enabled for the current or explicit CodeGraphy Workspace |
| `codegraphy_plugins_enable` | Enables a registered plugin package for the current or explicit CodeGraphy Workspace |
| `codegraphy_plugins_disable` | Removes a plugin package from the workspace-local enabled plugin array |
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

For the full setup guide, agent config shape, query controls, and verification flow, see [docs/MCP.md](../../docs/MCP.md).
