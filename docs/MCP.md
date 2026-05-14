# CodeGraphy MCP Setup

CodeGraphy MCP gives an agent a lightweight command/query adapter over `@codegraphy/core`.

MCP and CLI commands operate on a CodeGraphy Workspace: the current folder by default, or an explicit `path` when one is provided. The package can run Indexing, report Graph Cache status, and execute Graph Query without opening or focusing VS Code.

## Package Roles

| Piece | Installed From | Role |
|---|---|---|
| `@codegraphy/core` | npm dependency | owns Indexing, Graph Cache reads/writes, plugin wiring, and Graph Query |
| CodeGraphy VS Code extension | VS Code Marketplace | visualizes the Relationship Graph and integrates with VS Code |
| `@codegraphy/mcp` | npm | installs the `codegraphy` CLI and local stdio MCP server backed by `@codegraphy/core` |
| Codex MCP entry | `codegraphy setup` or manual config | lets Codex launch `codegraphy mcp` |

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
codex mcp get codegraphy --json
```

Then start a new Codex session and ask:

```text
Use CodeGraphy to list the files connected to src/a.ts.
```

If the CodeGraphy Workspace has no Graph Cache yet, the MCP tool result tells the agent to run `codegraphy_index`. The matching CLI command is:

```bash
codegraphy index
```

## Step By Step

1. Install the MCP package:

```bash
npm install -g @codegraphy/mcp
```

2. Configure Codex:

```bash
codegraphy setup
```

3. Create or refresh the Graph Cache for the current folder:

```bash
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

5. Verify the MCP entry:

```bash
codex mcp list
codex mcp get codegraphy --json
```

6. Start a new Codex session:

```bash
codex
```

## Codex Manual Setup

If `codegraphy setup` cannot add the MCP entry automatically, use one of these.

One-off command:

```bash
codex mcp add codegraphy -- codegraphy mcp
```

Global Codex config in `~/.codex/config.toml`:

```toml
[mcp_servers.codegraphy]
command = "codegraphy"
args = ["mcp"]
```

Project-local Codex config in `.codex/config.toml`:

```toml
[mcp_servers.codegraphy]
command = "codegraphy"
args = ["mcp"]
```

## CLI Commands

| Command | What It Does | Typical Use |
|---|---|---|
| `codegraphy setup` | Configures the local CodeGraphy MCP entry for Codex | one-time machine setup |
| `codegraphy status [workspace]` | Reports Graph Cache state, stale reasons, and enabled plugins for the current or explicit CodeGraphy Workspace | decide whether to index before querying |
| `codegraphy index [workspace]` | Runs Indexing for the current or explicit CodeGraphy Workspace | create or overwrite the Graph Cache |
| `codegraphy plugins refresh` | Scans global npm roots for installed CodeGraphy plugin packages | update the user-level installed-plugin cache |
| `codegraphy plugins add <package>` | Adds one explicitly named globally installed plugin package | register a plugin that refresh does not auto-discover |
| `codegraphy plugins list [workspace]` | Shows installed plugins and workspace enablement | inspect available and enabled plugins |
| `codegraphy plugins enable <package> [workspace]` | Enables a cached plugin package for the current or explicit CodeGraphy Workspace | opt a workspace into plugin analysis |
| `codegraphy plugins disable <package> [workspace]` | Removes a plugin from the workspace-local enabled plugin array | turn off plugin analysis without uninstalling the package |
| `codegraphy list` | Lists legacy locally known repos from `~/.codegraphy/registry.json` | inspect old registry state |
| `codegraphy open <repo>` | Legacy command that opens a repo in VS Code | compatibility with older workflows |
| `codegraphy mcp` | Starts the local stdio MCP server | manual MCP runtime |

## MCP Tools

| Tool | What It Does | Typical Use |
|---|---|---|
| `codegraphy_status` | Reports CodeGraphy Workspace status for the MCP server working directory or an explicit `path` | decide whether to index before querying |
| `codegraphy_index` | Runs Indexing for the MCP server working directory or an explicit `path` without focusing VS Code | initialize or overwrite the Graph Cache |
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

`@codegraphy/core` applies stages in this order:

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
