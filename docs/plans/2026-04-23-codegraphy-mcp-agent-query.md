# CodeGraphy MCP Agent Query

## Goal

Expose CodeGraphy's persisted index as MCP tools so agents can ask for repo structure, symbol impact, and relation paths without rescanning the codebase first.

## Scope

In:
- query engine over `.codegraphy/graph.lbug`
- symbol-first impact queries with file projection
- stdio MCP server for Codex CLI
- explicit tool parameters for scope and filters
- docs for internal tests and manual Codex validation

Out:
- embeddings / vector storage
- automatic prompt injection of the full graph
- agent-specific UI inside the graph webview
- replacing current graph exports

## Decisions

- Query the persisted index, not the current-view export.
- Start at symbol level; derive file impact from symbols.
- Support 3 scopes:
  - `full-index`
  - `current-view`
  - `custom`
- User view state is available as an optional scope input, not a hard default.
- MCP transport starts as stdio because `codex mcp add <name> -- <command>` already supports it.
- Keep responses small and tool-shaped:
  - `nodes`
  - `edges`
  - `symbols`
  - `summary`
  - `limitations`
- Query tools guide file reading; they do not replace source inspection.

## Surface

### Query Engine

- Read `files`, `symbols`, and `relations` from the persisted LadybugDB snapshot.
- Build stable indexes for:
  - symbol by id
  - symbols by file
  - outgoing relations by symbol/file
  - incoming relations by symbol/file
  - file graph projection from symbol relations
- Accept optional filters:
  - edge kinds
  - node kinds
  - depth / hop limit
  - scope source

### MCP Tools

- `codegraphy_file_dependencies`
  - given file path
  - return outgoing related files and supporting symbol relations
- `codegraphy_file_dependents`
  - given file path
  - return incoming related files and supporting symbol relations
- `codegraphy_symbol_dependencies`
  - given symbol id or file-local symbol selector
  - return outgoing symbol relations
- `codegraphy_symbol_dependents`
  - given symbol id or file-local symbol selector
  - return incoming symbol relations
- `codegraphy_impact_set`
  - given symbol or file seed
  - return bounded transitive impact set
- `codegraphy_explain_relationship`
  - given 2 files or 2 symbols
  - return shortest relation path plus provenance
- `codegraphy_file_summary`
  - given file path
  - return declared symbols, incoming/outgoing counts, top relation kinds

## Package Direction

- `packages/extension`
  - owns query engine over persisted index
  - owns current-view filter projection inputs if we need them
- new package: `packages/mcp-server`
  - owns stdio MCP wiring
  - depends on query engine entrypoints

This keeps the index logic near the extension while keeping agent transport separate.

## Work

- `S1` define query contracts and scope/filter model
- `S2` implement snapshot-backed symbol/file indexes
- `S3` implement symbol-first query methods
- `S4` add file projection helpers
- `S5` expose MCP stdio server + tool schemas
- `S6` add internal tests for query engine + MCP server
- `S7` document Codex install / validation flow
- `S8` run one manual complex-change validation using Codex + MCP

## Internal Validation

- query engine tests:
  - symbol dependents
  - symbol dependencies
  - file dependents
  - impact set depth limiting
  - relationship path resolution
  - scope/filter application
- MCP tests:
  - tool registration
  - argument validation
  - query result shaping
  - missing index / missing symbol / missing file errors

Suggested commands:

```bash
pnpm --filter @codegraphy/extension test
pnpm --filter @codegraphy/mcp-server test
pnpm run typecheck
pnpm run lint
```

## Manual Validation

Separate from internal tests. This is the user-facing proof that Codex can consume CodeGraphy context.

### Setup

1. Build the relevant packages.
2. Open a real repo in VS Code with CodeGraphy installed.
3. Run CodeGraphy indexing until `.codegraphy/graph.lbug` exists and the graph is populated.
4. From a terminal, add the MCP server to Codex:

```bash
codex mcp add codegraphy -- node /absolute/path/to/packages/mcp-server/dist/server.js
```

5. Verify Codex sees it:

```bash
codex mcp list
codex mcp get codegraphy --json
```

### Query Validation

Start a fresh Codex session in the indexed repo:

```bash
codex -C /absolute/path/to/repo
```

Ask:

- `Use CodeGraphy MCP only to tell me what files depend on <file>.`
- `Use CodeGraphy MCP to explain the relationship between <file A> and <file B>.`
- `Use CodeGraphy MCP to list symbols declared by <file> and their dependents.`

Expected:

- Codex reports CodeGraphy-derived structure before reading source files.
- Returned files and symbols match the graph/index.
- If the index lacks a relation, Codex says so instead of inventing one.

### Scope Validation

Run the same query 3 ways:

- full index
- current view
- custom edge-kind filter such as `import,type-import`

Expected:

- full index returns the broadest result
- current view respects the visible graph slice
- custom scope/filter overrides the view when requested

### Complex Change Validation

Start a fresh Codex session and ask for a real change:

- `Before reading files, use CodeGraphy MCP to identify the symbols and files impacted by <feature change>. Then make the change.`

Expected:

- Codex first names the impacted files/symbols from CodeGraphy
- Codex reads a targeted subset of files instead of wandering broadly
- final changes include the obvious impact sites found via the graph
- explanation references CodeGraphy findings as part of change planning

## PR Validation Checklist

- [ ] query engine answers symbol-level impact from persisted index
- [ ] MCP server registers and serves the planned tools
- [ ] Codex CLI can add the server with `codex mcp add ...`
- [ ] fresh Codex session can answer file/symbol dependency questions via CodeGraphy
- [ ] fresh Codex session can use CodeGraphy findings to guide a non-trivial code change
- [ ] docs include both internal test commands and manual user validation steps

## Unresolved Questions

- How should `current-view` scope be obtained outside VS Code: saved snapshot, live extension bridge, or not in MVP?
- What symbol selector shape is best for users and agents when symbol IDs are opaque?
- Should `packages/mcp-server` depend directly on `packages/extension`, or should shared query code move into a smaller package first?
