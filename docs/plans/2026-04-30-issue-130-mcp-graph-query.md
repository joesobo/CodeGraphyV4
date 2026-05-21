# Issue 130 MCP Graph Query

## Goal

Align CodeGraphy MCP with the Graph Cache auto-update model by making MCP a lightweight command/query Adapter over the Core Extension, not a second graph cache reader or freshness workflow.

## Problem

The current MCP package exposes Graph Cache lifecycle concepts as agent-facing product behavior:

- `fresh | stale | missing`
- `codegraphy_repo_status`
- `codegraphy_request_reindex`
- CLI `codegraphy status`
- CLI `codegraphy reindex`
- docs that tell agents to manage stale or missing saved indexes

That creates a shallow Interface. Agents learn internal cache lifecycle details instead of asking CodeGraphy for graph data.

The deeper seam should be the Core Extension Graph Query Module:

- Core Extension owns Graph Cache access.
- Core Extension owns Indexing.
- Core Extension owns plugin wiring.
- Core Extension owns Graph Query execution.
- MCP and CLI send commands/queries and return data.

## Target Architecture

### Core Extension

Add or evolve a Core Extension `graphQuery` Module under the core domain, likely:

```text
packages/extension/src/core/graphQuery/
```

The Graph Query Module owns:

- Relationship Graph query execution
- Graph Scope
- Filter
- Search
- Show Orphans where applicable
- deterministic sorting
- offset/limit pagination
- structural Folder Node and Workspace Package projection
- structural `nests` Relationships
- high-level edge reporting
- detailed Relationship grouping
- symbol evidence and ranges
- bounded path finding

The Graph View is a UI Adapter over this Module. MCP is an agent Adapter over this Module.

### MCP and CLI

MCP and CLI delegate `.codegraphy/graph.lbug` access to the Core Extension.

MCP and CLI:

- open or focus the repo in VS Code
- establish an active Core Extension connection
- ask the Core Extension to run Indexing
- send Graph Query requests to the Core Extension
- return Core Extension data responses unchanged except for transport shaping

This is a forward migration. Remove old names and move callers to the new contract.

## Tool Surface

### Repo Connection

`codegraphy_open_repo`

Input:

```json
{ "repo": "/absolute/path/to/repo" }
```

Behavior:

- opens or focuses VS Code for the repo
- establishes the active Core Extension connection
- fails immediately if the Core Extension is unavailable
- becomes the only tool with a `repo` parameter
- returns active repo confirmation and Graph Cache availability
- if `graphCacheExists` is false, includes a short message saying to run `codegraphy_index_repo()`

Example result:

```json
{
  "repo": "/absolute/path/to/repo",
  "graphCacheExists": false,
  "message": "Graph Cache has not been created yet. Run `codegraphy_index_repo()` before querying."
}
```

### Indexing

`codegraphy_index_repo`

Input:

```json
{}
```

Behavior:

- requires an active repo from `codegraphy_open_repo`
- asks the Core Extension to run Indexing
- waits until Indexing succeeds and Graph Cache exists
- no timeout parameter
- if VS Code reports failure, returns the failure
- tool description notes large repos can take time

Example result:

```json
{
  "repo": "/absolute/path/to/repo",
  "graphCache": ".codegraphy/graph.lbug",
  "message": "CodeGraphy indexing completed. Query tools can now read the Graph Cache."
}
```

### Query Tools

All query tools:

- require an active repo
- do not accept `repo`
- require Graph Cache to exist
- return a copy-paste error if no active repo exists:

```json
{
  "error": "repo_not_open",
  "message": "Open a repo first with `codegraphy_open_repo({\"repo\":\"/absolute/path/to/repo\"})`."
}
```

- return a copy-paste error if Graph Cache is absent:

```json
{
  "error": "graph_cache_not_found",
  "message": "This repo has not been indexed by CodeGraphy yet. Run `codegraphy_index_repo()`, then retry this query."
}
```

## Shared Query Inputs

Where meaningful, list tools accept:

```json
{
  "scope": {
    "nodes": {
      "file": true,
      "folder": false,
      "package": false
    },
    "edges": {
      "import": true,
      "type-import": true,
      "call": true,
      "reference": true,
      "test": true,
      "nests": false
    }
  },
  "filters": [
    { "field": "edgeTypes", "op": "includes", "value": "type-import" },
    { "field": "from", "op": "equals", "value": "packages/app/src/a.ts" }
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

Rules:

- Graph Scope before Filter
- Filter before Search
- Search before Show Orphans
- Show Orphans only where applicable
- sorting after graph/query reduction
- pagination after sorting
- multiple filters combine with AND
- search is one string using existing CodeGraphy Search semantics
- multiple sort fields break ties only
- default `limit` is 500
- default `offset` is 0
- no hard maximum limit
- all list responses include the same `page` object
- collection keys stay domain-specific

Example page shape:

```json
{
  "nodes": [],
  "page": {
    "offset": 0,
    "limit": 500,
    "returned": 500,
    "total": 2103
  }
}
```

## Query Contracts

### `codegraphy_list_nodes`

Purpose: list indexed graph nodes available to agents.

Defaults:

- File Nodes only
- deterministic sort by node path/name

Graph Scope:

- includes Folder Nodes when folder scope is enabled
- includes Workspace Package nodes when package scope is enabled

Item shape:

```json
{
  "path": "packages/app/src/a.ts",
  "nodeType": "file"
}
```

Notes:

- use exact full repo-relative node values from this tool in other queries
- no internal node ids in the MCP Interface

### `codegraphy_list_edges`

Purpose: high-level node connection list.

Defaults:

- file-to-file Relationships only
- one row per `from` / `to` pair
- `edgeTypes` lists all Edge Types connecting the pair

Item shape:

```json
{
  "from": "packages/app/src/a.ts",
  "to": "packages/app/src/b.ts",
  "edgeTypes": ["import", "type-import"]
}
```

Rules:

- supports `from`, `to`, and `edgeType` filters
- `from` and `to` are exact values from `codegraphy_list_nodes`
- if filtering by `edgeType`, keep stable response shape and return `edgeTypes`
- includes structural `nests` edges only when folder/package Node Types and `nests` Edge Type are enabled through Graph Scope

### `codegraphy_list_relationships`

Purpose: detailed Relationship data grouped to reduce duplicate file pair noise.

Defaults:

- broad query allowed
- paginated
- tool description warns broad relationship queries can be expensive

Item shape:

```json
{
  "from": "packages/app/src/a.ts",
  "to": "packages/app/src/b.ts",
  "relationships": [
    {
      "edgeType": "type-import",
      "symbols": [
        {
          "name": "UserConfig",
          "range": { "startLine": 3, "endLine": 8 }
        }
      ]
    },
    {
      "edgeType": "import",
      "symbols": [
        {
          "name": "createUser",
          "kind": "function",
          "range": { "startLine": 20, "endLine": 38 }
        }
      ]
    }
  ]
}
```

Rules:

- groups by `from` / `to`, then by Edge Type
- includes symbol evidence when known
- symbol `filePath` is omitted because `to` already gives the target file
- symbol `kind` is included only when it adds information not implied by the Edge Type
- omit `specifier` for now because it usually duplicates `to`
- hide core Tree-sitter provenance
- include plugin provenance for plugin-owned Relationships when useful
- include structural `nests` Relationships when folder/package Node Types and `nests` Edge Type are enabled
- structural `nests` Relationship groups have no symbols

### `codegraphy_list_symbols`

Purpose: list symbol declarations or relationship-backed symbol evidence.

Inputs:

```json
{
  "filePath": "packages/app/src/b.ts",
  "relatedFrom": "packages/app/src/a.ts",
  "relatedTo": "packages/app/src/c.ts",
  "edgeType": "type-import"
}
```

Rules:

- `filePath` is optional
- no `filePath` means broad symbol list across indexed File Nodes
- broad symbol list is paginated and tool description warns it can be large
- `filePath` alone returns every declared symbol in that file
- relationship filters return only symbols backed by indexed Relationship evidence
- no fallback from relationship evidence mode to "all symbols in file"
- `filePath`, `relatedFrom`, and `relatedTo` are exact full repo-relative values from `codegraphy_list_nodes`
- symbols include range when available
- folder/package Graph Scope does not apply

Declaration inventory example:

```json
{
  "symbols": [
    {
      "filePath": "packages/app/src/b.ts",
      "name": "UserConfig",
      "kind": "type",
      "range": { "startLine": 3, "endLine": 8 }
    }
  ],
  "page": {
    "offset": 0,
    "limit": 500,
    "returned": 1,
    "total": 1
  }
}
```

Relationship evidence example:

```json
{
  "symbols": [
    {
      "name": "UserConfig",
      "range": { "startLine": 3, "endLine": 8 }
    }
  ],
  "page": {
    "offset": 0,
    "limit": 500,
    "returned": 1,
    "total": 1
  }
}
```

### `codegraphy_find_paths`

Purpose: return bounded directed node paths from one node to another.

Input:

```json
{
  "from": "packages/app/src/a.ts",
  "to": "packages/app/src/d.ts",
  "maxDepth": 10,
  "maxPaths": 3
}
```

Defaults:

- `maxDepth`: 10
- `maxPaths`: 3

Rules:

- `from` and `to` are exact full repo-relative node values from `codegraphy_list_nodes`
- no direction option because `from` to `to` already defines direction
- returns node paths only
- does not include Edge Types
- does not include symbols
- no pagination
- no paths returns `paths: []`

Result shape:

```json
{
  "from": "packages/app/src/a.ts",
  "to": "packages/app/src/d.ts",
  "paths": [
    [
      "packages/app/src/a.ts",
      "packages/app/src/b.ts",
      "packages/app/src/d.ts"
    ]
  ],
  "limits": {
    "maxDepth": 10,
    "maxPaths": 3
  }
}
```

## Removed Surface

Remove without compatibility aliases:

- MCP `codegraphy_select_repo`
- MCP `codegraphy_repo_status`
- MCP `codegraphy_request_reindex`
- MCP `codegraphy_file_dependencies`
- MCP `codegraphy_file_dependents`
- MCP `codegraphy_symbol_dependencies`
- MCP `codegraphy_symbol_dependents`
- MCP `codegraphy_impact_set`
- MCP `codegraphy_explain_relationship`
- MCP `codegraphy_file_summary`
- MCP `codegraphy_view_graph`
- CLI `codegraphy status`
- CLI `codegraphy reindex`

Replace with:

- MCP `codegraphy_open_repo`
- MCP `codegraphy_index_repo`
- MCP `codegraphy_list_nodes`
- MCP `codegraphy_list_edges`
- MCP `codegraphy_list_relationships`
- MCP `codegraphy_list_symbols`
- MCP `codegraphy_find_paths`
- CLI `codegraphy open <repo>`
- CLI `codegraphy index`
- CLI query commands that return the same JSON contracts as MCP where useful

## Implementation Slices

### S1: Contract Tests First

Add failing tests for the new contracts before production changes:

- `open_repo` succeeds and returns active repo plus `graphCacheExists`
- `open_repo` fails when Core Extension is unavailable
- `index_repo` requires active repo
- query tools require active repo
- query tools require Graph Cache
- absent Graph Cache error names `codegraphy_index_repo()`
- no query tool accepts `repo`
- removed tool names are no longer registered
- CLI no longer exposes `status` or `reindex`

### S2: Core Extension Graph Query Module

Move the current graph derivation work toward `core/graphQuery`.

Responsibilities:

- relationship graph input model
- query config model
- scope/filter/search order
- structural folder/package projection
- `nests` behavior
- sorting
- pagination
- response page metadata

The existing visible graph derivation can become an internal graph query projection instead of the top-level seam.

### S3: Core Query Reports

Implement report builders inside the Core Extension:

- nodes report
- edges report
- relationships report
- symbols report
- paths report

These report builders should be tested through the Graph Query Interface, not through MCP transport.

### S4: Extension Request/Response Transport

Reuse the existing VS Code open/focus mechanism where possible.

Add the smallest request/response path needed for MCP to:

- open/focus a repo
- detect Core Extension availability
- request Indexing
- request Graph Query reports
- receive success/failure JSON

MCP always delegates Graph Cache reads to the Core Extension.

### S5: MCP Adapter

Replace the MCP server tool surface.

MCP responsibilities:

- active repo connection state
- argument validation
- command/query forwarding to Core Extension
- returning Core Extension responses
- simple copy-paste setup errors

MCP non-responsibilities:

- Graph Cache reads
- freshness/staleness checks
- graph derivation
- symbol relation indexing
- path search implementation

### S6: CLI Adapter

Replace CLI commands:

- `codegraphy open <repo>`
- `codegraphy index`
- query commands mirroring MCP response JSON where useful

Remove:

- `codegraphy status`
- `codegraphy reindex`

### S7: Docs and Changesets

Update:

- `docs/MCP.md`
- root `README.md`
- `packages/codegraphy-mcp/README.md`
- MCP skill/tool guidance if present
- package changelog only if the repo expects manual changelog updates

Changesets:

- `@codegraphy-vscode/mcp`: major
- `@codegraphy-dev/extension`: likely minor or major depending on exported user-facing behavior
- plugin API only if contracts change

Docs should use:

- Graph Cache
- Indexing
- CodeGraphy MCP
- Graph Query

Docs should not use:

- saved index
- saved DB
- CodeGraphy database
- stale/fresh/missing as agent workflow
- reindex in MCP/CLI language

## Test Plan

Targeted tests while iterating:

```bash
pnpm --filter @codegraphy-dev/extension test
pnpm --filter @codegraphy-vscode/mcp test
pnpm --filter @codegraphy-vscode/mcp run typecheck
pnpm --filter @codegraphy-vscode/mcp run lint
```

Before PR:

```bash
pnpm run test
pnpm run typecheck
pnpm run lint
```

Add focused tests for:

- Graph Query stage order
- structural folders/packages/nests in node/edge/relationship reports
- sorting tie-breaks
- pagination metadata
- symbol range exposure
- relationship-filtered symbols with no fallback
- path finding defaults and no-path result
- no old MCP tools
- no old CLI commands
- Graph Cache absent errors

## Definition Of Done

- MCP no longer exposes freshness/staleness/status as normal workflow.
- MCP no longer reads Graph Cache directly.
- Core Extension owns Graph Query execution.
- `codegraphy_open_repo` is the only repo-targeting tool.
- `codegraphy_index_repo()` has no args and operates on the active repo.
- Query tools operate on active repo only.
- CLI mirrors the same open/index/query direction.
- Old tool and command names are removed with no aliases.
- Docs describe Index then Query, not status then reindex.
- Changesets document the breaking MCP/CLI contract.
- Tests cover the Graph Query Interface and MCP/CLI adapters.

## Open Questions

- Exact transport mechanism between MCP and the Core Extension needs source discovery.
- Exact CLI query command names can be chosen during implementation, as long as JSON shapes match MCP.
