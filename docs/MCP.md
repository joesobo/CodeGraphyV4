# CodeGraphy MCP Setup

CodeGraphy MCP gives an agent a lightweight command/query Adapter over the CodeGraphy Core Extension.

The MCP package does not index source files and does not read the Graph Cache for query logic. The Core Extension owns Indexing, Graph Cache access, plugin wiring, and Graph Query execution. MCP opens or focuses the repo in VS Code, sends Indexing or Graph Query requests, and returns the Core Extension response.

## Package Roles

| Piece | Installed From | Role |
|---|---|---|
| CodeGraphy Core Extension | VS Code Marketplace | indexes the repo, owns the Graph Cache, renders the graph, and executes Graph Query |
| `@codegraphy/mcp` | npm | installs the `codegraphy` CLI and local stdio MCP server |
| Codex MCP entry | `codegraphy setup` or manual config | lets Codex launch `codegraphy mcp` |

## Prerequisites

- Node `22.22.0` or newer within the supported Node 22 range.
- VS Code with the CodeGraphy Core Extension installed.
- The VS Code `code` shell command available in your terminal.
- Codex or another MCP-capable agent.

## Quick Start

```bash
npm install -g @codegraphy/mcp
codegraphy setup
codegraphy open .
codex mcp list
codex mcp get codegraphy --json
```

Then start a new Codex session and ask:

```text
Use CodeGraphy to list the files connected to src/a.ts.
```

If the repo has no Graph Cache yet, the MCP tool result tells the agent to run `codegraphy_index_repo()`. The matching CLI command is:

```bash
codegraphy index
```

## Step By Step

1. Install the [CodeGraphy extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
2. Install the MCP package:

```bash
npm install -g @codegraphy/mcp
```

3. Configure Codex:

```bash
codegraphy setup
```

4. Open or focus the repo through VS Code:

```bash
codegraphy open /absolute/path/to/repo
```

5. If the Graph Cache has not been created yet, run Indexing:

```bash
codegraphy index
```

6. Verify the MCP entry:

```bash
codex mcp list
codex mcp get codegraphy --json
```

7. Start a new Codex session:

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
| `codegraphy open <repo>` | Opens or focuses the repo in VS Code and marks it active for CLI Indexing | repo setup |
| `codegraphy index` | Asks the Core Extension to run Indexing for the active repo | create or overwrite the Graph Cache |
| `codegraphy list` | Lists locally known repos from `~/.codegraphy/registry.json` | verify active repo registration |
| `codegraphy mcp` | Starts the local stdio MCP server | manual MCP runtime |

## MCP Tools

| Tool | What It Does | Typical Use |
|---|---|---|
| `codegraphy_open_repo` | Opens or focuses a repo in VS Code and establishes the active Core Extension connection | start a session |
| `codegraphy_index_repo` | Asks the Core Extension to run Indexing for the active repo | initialize or overwrite the Graph Cache |
| `codegraphy_list_nodes` | Lists graph nodes, defaulting to File Nodes | discover exact node paths |
| `codegraphy_list_edges` | Lists high-level `from` / `to` connections with grouped Edge Types | see immediate file/folder/package connections |
| `codegraphy_list_relationships` | Lists detailed relationships grouped by node pair and Edge Type | inspect symbol-backed connection evidence |
| `codegraphy_list_symbols` | Lists declarations or relationship-backed symbol evidence | find exact symbols and ranges |
| `codegraphy_find_paths` | Finds bounded directed node paths from one exact node path to another | understand multi-hop reachability |

Query tools require an active repo from `codegraphy_open_repo`. If the active repo has no Graph Cache, they return a copy-paste message telling the agent to run `codegraphy_index_repo()`.

Broad list calls are paginated. The default page is `limit: 500, offset: 0`, and agents can pass a higher `limit` or an `offset` for follow-up pages.

## Query Inputs

List tools accept the shared query controls where meaningful:

```json
{
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

The Core Extension applies stages in this order:

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

- `codegraphy_open_repo` is the only MCP tool that accepts a repo path.
- Query tools use exact node paths returned by `codegraphy_list_nodes`.
- Folder and package nodes appear only when Graph Scope opts them in.
- Symbol and Variable nodes appear only when Graph Scope opts them in. Variable depends on Symbol.
- Structural `nests` relationships appear only when the relevant node scope and `nests` edge scope are enabled.
- File-to-symbol `contains` relationships appear only when Symbol and the `contains` Edge Type are enabled.
- `codegraphy_list_symbols` with only `filePath` returns declarations in that file.
- `codegraphy_list_symbols` with relationship filters returns only relationship-backed symbol evidence.
- Symbol and relationship evidence includes canonical symbol IDs, ranges, signatures, and plugin metadata when available.
- `codegraphy_find_paths` returns node paths only; agents can call edge or symbol tools afterward for details.
