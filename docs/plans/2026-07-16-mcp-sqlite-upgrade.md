# Replace The Graph Cache Database And Restore MCP Reliability

## Status

Proposed for review. This plan deliberately stops after the storage and MCP
foundation is reliable. Agent-oriented exploration, impact, source-context, and
token-budget features should be planned after the foundation passes the exit
criteria below.

## Goal

Replace LadybugDB with SQLite as the storage engine for the workspace-local
Graph Cache, then make `@codegraphy-dev/mcp` installable, launchable, fresh,
query-correct, and testable through the same published-package path users run.

The intended outcome is:

- VS Code, Core, CLI, and MCP continue to share one Graph Cache.
- SQLite persists indexed files, symbols, Relationships, provenance, and cache
  metadata without changing the meaning of the Relationship Graph.
- MCP starts from a clean npm install on every supported runtime and platform.
- MCP never silently broadens a query or presents an untrustworthy empty result
  as authoritative.
- an agent can discover a missing or stale cache, run Indexing explicitly, and
  verify that the resulting Graph Cache is fresh before querying it.

## Why Start Here

The current MCP package already exposes Core Indexing and Graph Query, but live
testing found foundation failures before higher-level agent tools could be
evaluated fairly:

- the published MCP executable could install yet fail at startup because a
  Tree-sitter grammar imported by the bundled Core code was not resolvable;
- local builds could fail for the same class of dependency-boundary problem;
- advertised `from`, `to`, and `edgeType` inputs could be ignored, returning a
  broad page of unrelated Edges;
- a stale Graph Cache could return an empty successful result that looked
  authoritative;
- full Indexing could complete while status remained stale because legacy
  package-name plugin entries and canonical Plugin IDs produced different
  signatures;
- transitive impact required repeated client-side calls and could generate far
  more context than ordinary source search.

Replacing the database alone will not fix those MCP contract problems. The
storage migration and MCP reliability work therefore belong in one foundation
program with separate, independently verifiable slices.

## Settled Direction

### 1. SQLite Replaces LadybugDB

SQLite becomes the only Graph Cache database engine. Remove
`@ladybugdb/core`, Ladybug-specific query syntax, native runtime vendoring, and
`.lbug` implementation terminology from the canonical path.

Continue to call the product artifact the **Graph Cache**. SQLite is an
implementation detail, not a replacement product term.

### 2. Core Continues To Own Storage And Graph Query

`@codegraphy-dev/core` remains the central engine and owns:

- SQLite connections, schema migrations, and transactions;
- full and incremental Indexing writes;
- Graph Cache status, integrity, and freshness;
- snapshot reads and Graph Query execution;
- the storage contracts consumed by the extension, CLI, and MCP.

MCP remains an adapter over Core. The extension must not acquire a separate
SQLite implementation, and MCP must not issue SQL directly.

### 3. One Workspace-Local Database

The canonical database path becomes:

```text
<workspace-root>/.codegraphy/graph.sqlite
```

Do not create separate MCP, CLI, or extension databases.

Existing `graph.lbug` files are not converted in place. On first use after the
upgrade, status reports a legacy Graph Cache and instructs the caller to run
Indexing. Successful Indexing writes `graph.sqlite`; after the SQLite cache is
verified, Core may remove the legacy file and its sidecars.

This is an intentional forward migration. Do not keep dual Ladybug/SQLite
readers as a permanent compatibility path.

### 4. Indexing Remains Explicit

Normal Graph Query calls do not silently start a potentially expensive index.
Agents receive structured recovery instructions and can invoke
`codegraphy_index` explicitly.

Every successful Indexing request must perform a post-index status read. It may
claim completion only when the SQLite cache is readable, internally consistent,
and fresh against the same normalized settings, plugin, and analysis inputs
used during Indexing.

### 5. Package Behavior Is Tested From Published Artifacts

Workspace source tests are necessary but not sufficient. Release confidence
comes from packing the actual Core and MCP packages, installing those tarballs
in a clean temporary project, launching `codegraphy-mcp` over stdio, and calling
its tools through an MCP client.

## SQLite Driver Decision Gate

SQLite is settled; the Node binding is not. Select the binding through a short
spike before production migration.

Candidates must be evaluated against:

- Node 20, 22, and 24;
- macOS arm64/x64, Linux arm64/x64, and Windows x64;
- clean npm and pnpm installation;
- bundled Core inside the VSIX;
- Core CLI and MCP stdio startup;
- prepared statements, transactions, WAL, foreign keys, recursive CTEs, FTS5,
  integrity checks, and backup/checkpoint support;
- synchronous reads for existing hot paths and cancellation-friendly async
  boundaries for longer writes;
- no runtime downloads during VS Code activation or normal MCP startup.

Do not select a binding only because its local API is convenient. A native
addon that repeats the current platform-package or compiler failures does not
meet the goal. Record the selected binding and rejected alternatives in an ADR
before the migration slice merges.

## Proposed SQLite Model

Start with normalized facts and preserve JSON only for plugin-defined or
forward-compatible metadata.

### `cache_metadata`

- `schema_version INTEGER NOT NULL`
- `analysis_version TEXT NOT NULL`
- `indexed_at TEXT NOT NULL`
- `settings_signature TEXT NOT NULL`
- `plugin_signature TEXT`
- `cache_revision TEXT NOT NULL`
- `index_state TEXT NOT NULL`

The table contains exactly one current metadata row. `index_state` prevents an
interrupted writer from being mistaken for a completed cache.

### `files`

- `file_path TEXT PRIMARY KEY`
- `mtime_ms INTEGER NOT NULL`
- `size_bytes INTEGER NOT NULL`
- `language TEXT`
- `analysis_json TEXT NOT NULL`
- `content_hash TEXT`

Keep `analysis_json` during the first migration so storage replacement does not
also redesign the complete analysis cache contract. Extract fields into
normalized columns only when a measured query needs them.

### `symbols`

- `symbol_id TEXT PRIMARY KEY`
- `file_path TEXT NOT NULL REFERENCES files(file_path) ON DELETE CASCADE`
- `name TEXT NOT NULL`
- `kind TEXT`
- `signature TEXT`
- range start/end line and column columns
- `language TEXT`
- `source TEXT`
- `plugin_kind TEXT`
- `metadata_json TEXT`

Indexes:

- `(file_path)`
- `(name)`
- `(kind, name)`

### `relationships`

- `relationship_id TEXT PRIMARY KEY`
- `owning_file_path TEXT REFERENCES files(file_path) ON DELETE CASCADE`
- `edge_type TEXT NOT NULL`
- `from_file_path TEXT`
- `to_file_path TEXT`
- `from_node_id TEXT`
- `to_node_id TEXT`
- `from_symbol_id TEXT REFERENCES symbols(symbol_id) ON DELETE SET NULL`
- `to_symbol_id TEXT REFERENCES symbols(symbol_id) ON DELETE SET NULL`
- `plugin_id TEXT`
- `source_id TEXT`
- `specifier TEXT`
- `relation_type TEXT`
- `variant TEXT`
- `resolved_path TEXT`
- `provenance TEXT NOT NULL`
- `resolution_status TEXT NOT NULL`
- `metadata_json TEXT`

Indexes:

- `(from_file_path, edge_type)`
- `(to_file_path, edge_type)`
- `(from_symbol_id, edge_type)`
- `(to_symbol_id, edge_type)`
- `(owning_file_path)`

Use recursive CTEs for bounded dependency, dependent, and impact traversal.
Cycle detection, depth, result count, and traversal direction must be bounded in
SQL rather than through one MCP round trip per node.

### Search

Add FTS5 only after the normalized schema is stable. The first FTS table should
index file paths, symbol names, kinds, and signatures for anchor discovery. FTS
finds candidate anchors; graph relationships remain authoritative for traversal.

## Database Behavior

- Enable foreign keys on every connection.
- Use prepared statements for all values.
- Wrap full Indexing and each incremental patch in explicit transactions.
- Prefer WAL when the selected binding and packaging matrix support it, so
  readers can continue while Indexing writes.
- Define checkpoint and sidecar cleanup behavior explicitly.
- Store and migrate `schema_version`; never infer schema from table presence.
- Run `quick_check` after a newly built cache and `integrity_check` in the doctor
  workflow or when corruption is suspected.
- On corruption, preserve enough diagnostic context to explain the failure,
  quarantine or remove the bad cache, and require explicit Indexing.
- Do not expose raw SQL through the initial MCP upgrade.

## Work Plan

### Phase 0: Reproduce And Lock The Failures

1. Add a clean-package MCP harness that packs Core and MCP into tarballs.
2. Install into an empty temporary project using a supported Node runtime.
3. Launch the installed `codegraphy-mcp` binary through stdio.
4. Assert MCP initialization, server version, `tools/list`, status, Indexing,
   direct Edge filtering, symbol lookup, and cache reuse after restart.
5. Add failing tests for:
   - missing transitive runtime dependencies;
   - ignored `from`, `to`, and `edgeType` inputs;
   - stale empty results being returned as ordinary success;
   - Indexing completing while the resulting status is still stale;
   - duplicate package-name and Plugin ID settings entries.

Exit: the known failures are reproducible without relying on the developer
monorepo's hoisted or linked dependencies.

### Phase 1: Select And Package SQLite

1. Build the driver spike against the platform/runtime matrix.
2. Verify transactions, recursive CTEs, FTS5, WAL, and integrity checks.
3. Verify npm tarball, global CLI, MCP stdio, and VSIX loading.
4. Record the binding decision in an ADR.
5. Add the dependency only to the package that imports it directly; keep
   explicit extension runtime packaging only if the binding cannot be bundled.

Exit: a trivial SQLite database can be created, reopened, queried, and removed
through Core in every supported delivery surface.

### Phase 2: Introduce The SQLite Graph Cache

Follow TDD file by file.

1. Add SQLite connection and transaction modules with matching tests.
2. Add versioned migrations and the initial schema.
3. Port full cache save/load behavior.
4. Port incremental changed-file patches without rewriting unrelated rows.
5. Port symbol and Relationship snapshot reads.
6. Preserve deterministic ordering at public API boundaries.
7. Change the canonical cache path to `graph.sqlite`.
8. Detect `graph.lbug` as legacy and return explicit reindex guidance.
9. Remove Ladybug code and dependencies after parity tests pass.

Exit: current storage, Indexing, snapshot, status, and extension lifecycle tests
pass against SQLite with no Ladybug runtime present.

### Phase 3: Make Freshness Trustworthy

1. Normalize configured plugins to canonical Plugin IDs before activity and
   signature calculation.
2. Migrate and deduplicate legacy package-name entries in Workspace Settings.
3. Make Indexing and status calculate signatures from the same normalized
   plugin records.
4. Persist signatures and cache revision in SQLite metadata within the Indexing
   transaction.
5. Re-read status after commit and fail the Indexing request if it is not fresh.
6. Distinguish missing, legacy, corrupt, interrupted, stale, and fresh caches.

Exit: a successful Indexing request always ends in `fresh`; otherwise it returns
a structured failure explaining why.

### Phase 4: Correct The Existing Graph Query Contract

1. Apply `from`, `to`, and `edgeType` consistently to Edges and Relationships.
2. Replace arbitrary filter and sort strings with report-specific enums.
3. Reject unknown fields and operators instead of silently broadening results.
4. Bound `limit`, `maxDepth`, and `maxPaths` server-side.
5. Add result `outputSchema` definitions and structured MCP errors.
6. Include cache revision, freshness, and analysis coverage in query results.
7. Investigate missing TypeScript declarations and prove that a named exported
   function is returned by file and symbol queries.

Exit: every advertised input has an integration test that proves it changes the
result, and no invalid narrow query can degrade into a broad query.

### Phase 5: Fix MCP Packaging And Recovery

1. Decide the bundle boundary deliberately: either bundle Core into MCP with
   verified native externals or publish every runtime dependency required by the
   externalized Core build.
2. Derive the MCP server version from package metadata.
3. Add structured errors for missing, legacy, corrupt, interrupted, and stale
   Graph Caches.
4. Add a shared freshness option:
   - `require-fresh`
   - `allow-stale`
   - `refresh-if-stale`
5. Default change-impact operations to `require-fresh`; keep explicit Indexing
   as the recovery action.
6. Add `codegraphy_doctor` for runtime, package, database, plugin, settings, and
   integrity diagnostics.
7. Update the CodeGraphy skill and docs to match the tools actually shipped.

Exit: a clean installed agent can follow status -> index -> verify fresh ->
query without VS Code, source checkout, package-manager leakage, or hidden
dependencies.

### Phase 6: Validate And Release

Run at minimum:

- targeted Core Graph Cache and Graph Query tests while iterating;
- targeted MCP server and clean-package tests;
- extension Graph Cache lifecycle tests;
- `pnpm run test`;
- `pnpm run lint`;
- `pnpm run typecheck`;
- `pnpm run build`;
- one module-at-a-time mutation testing for changed storage, freshness, and
  query modules;
- package/launch matrix on Node 20, 22, and 24;
- clean VSIX smoke tests on supported operating systems.

Add changesets for Core, MCP, and the extension. Describe the user-visible
Graph Cache rebuild and supported runtime requirements.

## MCP Freshness Contract

High-impact tools should follow this state machine:

```text
status
  -> fresh: query
  -> missing: return index recovery action
  -> legacy: return index recovery action
  -> stale + require-fresh: return index recovery action
  -> stale + allow-stale: query with prominent warning
  -> stale + refresh-if-stale: index, verify fresh, then query
  -> corrupt/interrupted: return repair/index recovery action
```

A recovery response includes the exact tool and arguments:

```json
{
  "code": "graph_cache_stale",
  "workspaceRoot": "/workspace",
  "reasons": ["plugin-signature-changed"],
  "recovery": {
    "tool": "codegraphy_index",
    "arguments": { "path": "/workspace" }
  }
}
```

Empty results from `allow-stale` must carry a warning stating that absence is
not authoritative until the cache is fresh.

## Release And Migration Behavior

- This is a user-facing breaking Graph Cache format change.
- Existing source settings remain, but legacy plugin aliases are normalized.
- Existing `graph.lbug` data is rebuildable cache data, not user-authored data.
- The extension shows the readable current graph while background Graph Cache
  Sync runs where possible; it must not render a legacy database as current.
- CLI and MCP report a copy-paste Indexing recovery action.
- Documentation uses `graph.sqlite` only after the implementation lands.
- Release notes explain that the first run rebuilds the Graph Cache.

## Risks And Mitigations

### Native SQLite Packaging Repeats The Current Failure

Mitigation: driver selection is blocked on packed-artifact and VSIX tests across
the supported runtime/platform matrix.

### SQLite Performs Worse For Traversal

Mitigation: add representative recursive-CTE benchmarks before removing
Ladybug. Index directed endpoints and Edge Types, inspect query plans, and keep
traversal bounded.

### Full Cache Writes Block The Extension

Mitigation: use transactional writes, WAL where supported, existing async
Indexing boundaries, and measured checkpoint behavior. Keep current graph data
visible during Graph Cache Sync.

### Legacy Plugin Settings Keep Freshness Permanently Stale

Mitigation: one canonical Plugin ID normalization path feeds loading, metadata,
status, and settings migration.

### Storage Migration Expands Into Query Product Redesign

Mitigation: preserve current public storage contracts during Phases 1-3. Add
new agent-oriented query operations only after this plan's exit criteria pass.

## Deferred MCP Upgrade Ideas

Review these after the SQLite and reliability foundation lands:

- one default `codegraphy_explore` tool;
- dependency/dependent and bounded impact tools;
- file and module summaries;
- relationship explanations with minimal line-numbered source;
- affected-test discovery;
- token budgets and compact/detailed modes;
- FTS-backed anchor discovery;
- community and centrality analysis;
- Git diff and pull-request impact;
- optional compiler, SCIP, or language-server evidence providers;
- shared Streamable HTTP transport.

These features should consume the same Core Graph Query API and SQLite Graph
Cache. They are not prerequisites for replacing Ladybug or making the current
MCP package dependable.

## Review Questions

1. Is `graph.sqlite` the desired public filename, or should the implementation
   remain hidden behind an engine-neutral filename such as `graph.db`?
2. Should the first SQLite release delete `graph.lbug` after a successful
   rebuild, or retain it for one release as a rollback artifact?
3. Should `refresh-if-stale` be available to every MCP client, or require an
   explicit server configuration because it mutates the workspace cache?
4. Which runtime/platform matrix is release-blocking beyond Node 20/22/24 and
   macOS/Linux/Windows targets listed above?
5. Should FTS5 anchor discovery ship in the storage migration or wait for the
   first agent-oriented query upgrade?

## Foundation Exit Criteria

This plan is complete when:

- no production or packaged path depends on LadybugDB;
- one SQLite Graph Cache serves extension, Core CLI, and MCP;
- full and incremental Indexing preserve current graph semantics;
- a successful index ends fresh or returns a structured failure;
- MCP installs and launches from packed artifacts on the supported matrix;
- narrow Edge and Relationship inputs cannot return unrelated broad results;
- symbol queries return declarations for representative TypeScript exports;
- stale empty results cannot be mistaken for authoritative absence;
- the skill, docs, schemas, server version, and shipped tools agree;
- full quality gates and clean-install/VSIX smoke tests pass.
