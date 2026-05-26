# CodeGraphy MCP Setup

CodeGraphy MCP is the agent interface into `@codegraphy-dev/core`.

The Core Package is the central engine. The VS Code extension is the user interface, MCP is the agent interface, and `@codegraphy-dev/plugin-api` is the programmer interface for plugin authors. The terminal `codegraphy` command belongs to the Core Package npm package, so MCP stays optional and exposes Graph Query tools to agents without owning normal CLI workflows.

Every `codegraphy ...` terminal subcommand lives in `@codegraphy-dev/core`. `@codegraphy-dev/mcp` depends on `@codegraphy-dev/core` for runtime behavior and owns only the agent-agnostic `codegraphy-mcp` stdio server command. Core does not know about MCP clients. `codegraphy setup` is a Core CLI command for preparing CodeGraphy's own user state, not for configuring Codex, Claude, Cursor, or any other agent.

## Package Roles

| Piece | Installed From | Role |
|---|---|---|
| `@codegraphy-dev/core` | npm dependency | owns Indexing, Graph Cache reads/writes, plugin wiring, Graph Query, and the terminal `codegraphy` CLI |
| CodeGraphy VS Code extension | VS Code Marketplace | user interface that visualizes the Relationship Graph, integrates with VS Code, and depends on core at runtime |
| `@codegraphy-dev/mcp` | npm | optional local stdio agent interface backed by and dependent on `@codegraphy-dev/core` |
| `@codegraphy-dev/plugin-api` | npm dependency | programmer interface for creating plugin packages that interact with core |
| MCP client entry | Agent-specific config | lets Codex, Claude, Cursor, or another MCP-capable agent launch the CodeGraphy MCP server |

## Prerequisites

- Node `22.22.0` or newer within the supported Node 22 range.
- Codex, Claude, Cursor, or another MCP-capable agent.

## Quick Start

```bash
npm install -g @codegraphy-dev/mcp
```

Then configure your agent to launch `codegraphy-mcp`. After the agent starts the server, ask:

```text
Use CodeGraphy to list the files connected to src/a.ts.
```

If the CodeGraphy Workspace has no Graph Cache yet, the MCP tool result tells the agent to run `codegraphy_index`. Users who also install the Core CLI can run the matching terminal command:

```bash
codegraphy index
```

## Step By Step

1. Install the MCP package:

```bash
npm install -g @codegraphy-dev/mcp
```

2. Configure your MCP-capable agent to launch `codegraphy-mcp`.

3. Create or refresh the Graph Cache through the MCP `codegraphy_index` tool, or install the Core CLI and run:

```bash
npm install -g @codegraphy-dev/core
codegraphy index
```

Or index an explicit CodeGraphy Workspace:

```bash
codegraphy index /absolute/path/to/folder
```

4. Check status:

```bash
codegraphy status
codegraphy status /absolute/path/to/folder
```

5. Start a new session in your MCP-capable agent.

## Agent Configuration

MCP configuration is agent-specific. Point your agent's MCP server entry at `codegraphy-mcp`.

Example config shape:

```toml
[mcp_servers.codegraphy]
command = "codegraphy-mcp"
args = []
```

The MCP package does not expose `codegraphy mcp`. Extending the Core-owned `codegraphy` binary after install would require Core to know about MCP or the MCP package to publish a competing `codegraphy` binary.

## CLI Commands

These are core-owned CLI commands that MCP tools can ask users or agents to run when a workspace needs Indexing, status checks, or plugin changes.

| Command | What It Does | Typical Use |
|---|---|---|
| `codegraphy status [workspace]` | Reports Graph Cache state, stale reasons, and enabled plugins for the current or explicit CodeGraphy Workspace | decide whether to index before querying |
| `codegraphy index [workspace]` | Runs Indexing for the current or explicit CodeGraphy Workspace | create or overwrite the Graph Cache |
| `codegraphy plugins register <package>` | Registers one globally installed plugin package in the user-level Plugin Registry after validating its CodeGraphy metadata | make a global package available to workspaces |
| `codegraphy plugins list [workspace]` | Shows installed plugins and workspace enablement | inspect available and enabled plugins |
| `codegraphy plugins enable <package> [workspace]` | Enables a registered plugin package for the current or explicit CodeGraphy Workspace | opt a workspace into plugin analysis |
| `codegraphy plugins disable <package> [workspace]` | Removes a plugin from the workspace-local enabled plugin array | turn off plugin analysis without uninstalling the package |

For commands with `[workspace]`, the workspace is an optional trailing positional argument. Omitting the path targets the process current working directory exactly. CodeGraphy does not walk upward to find a parent repo or existing `.codegraphy` folder.

## MCP Tools

MCP tools should mirror the core CLI command semantics. They call Core APIs directly instead of shelling out to `codegraphy`.

| Tool | What It Does | Typical Use |
|---|---|---|
| `codegraphy_status` | Reports CodeGraphy Workspace status for the MCP server working directory or an explicit `path` | decide whether to index before querying |
| `codegraphy_index` | Runs Indexing for the MCP server working directory or an explicit `path` without focusing VS Code | initialize or overwrite the Graph Cache |
| `codegraphy_plugins_register` | Registers one globally installed plugin package in the user-level Plugin Registry after validating its CodeGraphy metadata | make a global package available to workspaces |
| `codegraphy_plugins_list` | Shows registered plugins and workspace enablement | inspect available and enabled plugins |
| `codegraphy_plugins_enable` | Enables a registered plugin package for the current or explicit CodeGraphy Workspace | opt a workspace into plugin analysis |
| `codegraphy_plugins_disable` | Removes a plugin from the workspace-local enabled plugin array | turn off plugin analysis without uninstalling the package |
| `codegraphy_list_nodes` | Lists graph nodes, defaulting to File Nodes; accepts optional `path` | discover exact node paths |
| `codegraphy_list_edges` | Lists high-level `from` / `to` connections with grouped Edge Types; accepts optional `path` | see immediate file/folder/package connections |
| `codegraphy_list_relationships` | Lists detailed relationships grouped by node pair and Edge Type; accepts optional `path` | inspect symbol-backed connection evidence |
| `codegraphy_list_symbols` | Lists declarations or relationship-backed symbol evidence; accepts optional `path` | find exact symbols and ranges |
| `codegraphy_find_paths` | Finds bounded directed node paths from one exact node path to another; accepts optional `path` | understand multi-hop reachability |

Query tools do not require a prior open/select call. If the CodeGraphy Workspace has no Graph Cache, they return a copy-paste message telling the agent to run `codegraphy_index`.

Broad list calls are paginated. The default page is `limit: 500, offset: 0`, and agents can pass a higher `limit` or an `offset` for follow-up pages.

## Query Inputs

List tools accept the shared query controls where meaningful:

```json
{
  "path": "/absolute/path/to/folder",
  "scope": {
    "nodes": { "file": true, "folder": true, "symbol": true, "variable": true },
    "edges": { "import": true, "type-import": true, "nests": true, "contains": true }
  },
  "filters": [
    { "field": "from", "op": "equals", "value": "packages/app/src/a.ts" },
    { "field": "edgeTypes", "op": "includes", "value": "type-import" }
  ],
  "search": "GraphQuery",
  "sort": [
    { "by": "from", "direction": "asc" },
    { "by": "to", "direction": "asc" }
  ],
  "limit": 500,
  "offset": 0
}
```

`path` is optional. When omitted, the tool uses the MCP server process working directory.

`@codegraphy-dev/core` applies stages in this order:

1. Graph Scope
2. Filters
3. Search
4. Show Orphans where applicable
5. Sort
6. Pagination

## Example Prompts

- `Use CodeGraphy to list nodes in this repo.`
- `Use CodeGraphy to list edges connected to packages/app/src/a.ts.`
- `Use CodeGraphy to list symbols involved in type-import relationships from packages/app/src/a.ts to packages/app/src/b.ts.`
- `Use CodeGraphy to list Godot class_name symbols in scripts/player.gd.`
- `Use CodeGraphy to find paths from packages/app/src/a.ts to packages/app/src/d.ts.`

## Notes

- All primary MCP tools accept optional `path`.
- The normal MCP workflow does not focus, open, or require VS Code.
- Query tools use exact node paths returned by `codegraphy_list_nodes`.
- Folder and package nodes appear only when Graph Scope opts them in.
- Symbol and Variable nodes appear only when Graph Scope opts them in. Variable depends on Symbol.
- Structural `nests` relationships appear only when the relevant node scope and `nests` edge scope are enabled.
- File-to-symbol `contains` relationships appear only when Symbol and the `contains` Edge Type are enabled.
- `codegraphy_list_symbols` with only `filePath` returns declarations in that file.
- `codegraphy_list_symbols` with relationship filters returns only relationship-backed symbol evidence.
- Symbol and relationship evidence includes canonical symbol IDs, ranges, signatures, and plugin metadata when available.
- `codegraphy_find_paths` returns node paths only; agents can call edge or symbol tools afterward for details.
