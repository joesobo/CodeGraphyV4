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
- Ship one public npm package named `codegraphy`.
- Public install target:
  - `npm install -g codegraphy`
  - `codegraphy setup`
- MCP runs locally over repo-local `.codegraphy/graph.lbug` data; no hosted mode in scope.
- Use a global registry so one CodeGraphy MCP install can serve many repos.
- `codegraphy setup` may update Codex MCP config automatically.
- Indexing and refresh should be callable by the agent through MCP tools.
- No live extension bridge in MVP. The MCP reads repo state directly from disk.
- MCP should detect when the CodeGraphy DB changed on disk and refresh its in-memory view.
- Support 3 scopes:
  - `full-index`
  - `current-view`
  - `custom`
- Defer `current-view` until a later bridge exists; MVP is effectively `full-index` + `custom`.
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
  - repo selector
  - scope source

### Repo Selection

- One MCP server should serve all indexed repos from a global registry.
- Default repo resolution order:
  - explicit `repo` tool argument
  - selected session repo
  - current working directory if it is a registered repo
- Add lightweight selection tools:
  - `codegraphy_list_repos`
  - `codegraphy_select_repo`
- This allows Codex to start from `$HOME` and still query any indexed repo without `cd`.

### MCP Tools

- `codegraphy_list_repos`
  - list indexed repos from the global registry
- `codegraphy_select_repo`
  - set the default repo for later queries
- `codegraphy_index_repo`
  - index or re-index a repo
- `codegraphy_repo_status`
  - report whether a repo is indexed, stale, or missing
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

- public package: `packages/codegraphy`
  - published as `codegraphy`
  - owns CLI commands:
    - `setup`
    - `index`
    - `mcp`
    - `status`
    - `list`
- `packages/extension`
  - remains the VS Code extension
  - should share index/query code where that improves correctness, but the public CLI must not require a live VS Code session

This keeps the public install story simple and matches the GitNexus-style single-package UX.

## Work

- `S1` define query contracts and scope/filter model
- `S2` define global repo registry + repo selection rules
- `S3` implement snapshot-backed symbol/file indexes
- `S4` implement symbol-first query methods
- `S5` add file projection helpers
- `S6` expose CLI commands + MCP stdio server + tool schemas
- `S7` add agent-callable indexing / status tools
- `S8` add internal tests for query engine + CLI + MCP server
- `S9` document public install, setup, and Codex validation flow
- `S10` run one manual complex-change validation using Codex + MCP

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
- CLI/registry tests:
  - repo registration
  - repo selection precedence
  - setup command config writing
  - stale DB detection after index changes on disk

Suggested commands:

```bash
pnpm --filter codegraphy test
pnpm run typecheck
pnpm run lint
```

## Manual Validation

Separate from internal tests. This is the user-facing proof that Codex can consume CodeGraphy context.

### Setup

1. Build the relevant packages.
2. Install the public CLI:

```bash
npm install -g codegraphy
codegraphy setup
```

3. Open a real repo in VS Code with CodeGraphy installed.
4. Run CodeGraphy indexing until `.codegraphy/graph.lbug` exists and the graph is populated, or index it from the CLI:

```bash
codegraphy index /absolute/path/to/repo
```

5. Verify the repo is registered:

```bash
codegraphy list
codegraphy status /absolute/path/to/repo
```

6. If setup did not write Codex config automatically, add the MCP server to Codex manually:

```bash
codex mcp add codegraphy -- npx -y codegraphy@latest mcp
```

7. Verify Codex sees it:

```bash
codex mcp list
codex mcp get codegraphy --json
```

### Query Validation

Start a fresh Codex session anywhere, including outside the repo:

```bash
codex
```

Ask:

- `Use CodeGraphy MCP to list indexed repos, then select <repo>.`
- `Use CodeGraphy MCP only to tell me what files depend on <file>.`
- `Use CodeGraphy MCP to explain the relationship between <file A> and <file B>.`
- `Use CodeGraphy MCP to list symbols declared by <file> and their dependents.`

Expected:

- Codex can discover and select the repo even when started outside the repo directory.
- Codex reports CodeGraphy-derived structure before reading source files.
- Returned files and symbols match the graph/index.
- If the index lacks a relation, Codex says so instead of inventing one.

### Scope Validation

Run the same query 2 ways in MVP:

- full index
- custom edge-kind filter such as `import,type-import`

Expected:

- full index returns the broadest result
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

- What symbol selector shape is best for users and agents when symbol IDs are opaque?
- How much of the existing extension indexing code can move into the public `codegraphy` package cleanly?
- Should `codegraphy setup` write only global Codex config, or also project-local config when run inside a repo?
