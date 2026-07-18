# Incremental Graph Cache Invalidation

## Decision summary

CodeGraphy should persist two related graphs with different jobs:

1. The **workspace graph** is the complete product data: files, folders, packages, symbols, plugin nodes, and typed edges. Graph Scope, edge toggles, search, and filters only project this stored graph.
2. The **analysis dependency graph** is indexing bookkeeping: which analysis computation read which input and which stored facts that computation owns. It decides what may need recomputation after a change.

These graphs can refer to the same files and facts, but they are not interchangeable. A visible `contains`, `inherits`, or plugin edge does not necessarily invalidate a producer when its target changes. Conversely, an analyzer can depend on settings, a plugin version, a directory listing, or an unresolved import without emitting any user-visible edge. Bazel and rustc obtain correct incrementality by recording computation inputs, not by inferring them from output relationships. Bazel explicitly warns that unregistered reads produce incorrect incremental builds; rustc records which query invocations executed other queries in a separate query DAG. [Bazel Skyframe](https://bazel.build/versions/8.4.0/reference/skyframe) [rustc incremental compilation](https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html)

The current `factsJson` column should therefore go away. It duplicates the canonical graph as one opaque serialized `IFileAnalysisResult`, makes precise ownership and indexed queries difficult, and is currently also the only source used to infer reverse invalidation. `propertiesJson` and `sourcesJson` have the same problem at a smaller scale. SQLite stores JSON as ordinary text and exposes it through tree-walking functions; fields used for identity, joins, filtering, ownership, freshness, provenance, or invalidation should be ordinary constrained columns. CodeGraphy's plugin metadata is already scalar-only, so typed property rows can preserve plugin extensibility without keeping core graph facts in JSON. [SQLite JSON functions](https://www.sqlite.org/json1.html)

## What the current branch does

- `IndexedFile.factsJson` stores the entire analysis result, including symbols and relations.
- `Node` and `Edge` store the canonical graph, but their remaining fields and sources are serialized into `propertiesJson` and `sourcesJson`.
- `findAffectedWorkspaceIndexAnalysisDependents` treats every relation with `toFilePath` or `resolvedPath` as an invalidation dependency and eagerly walks the complete reverse transitive closure.
- An incremental save updates only changed `IndexedFile` rows, but deletes and reinserts every `Node` and `Edge` row.
- CLI status compares persisted settings/plugin/version signatures and a `pendingChangedFiles` list. That list is written by the running extension's file watcher. A cold CLI edit made while the extension is not observing the workspace can therefore still be reported as fresh.

This is conservative, but it conflates product relationships, analysis dependencies, source facts, and transient freshness.

## Freshness without indexing

There is no truthful way for a new CLI process to know that the filesystem has not changed unless something observed the filesystem continuously or the CLI reconciles it now. Bazel describes the same boundary: bottom-up invalidation must `stat()` prior inputs, and a filesystem watcher such as `inotify` can avoid that scan. [Bazel Skyframe incrementality](https://bazel.build/versions/8.4.0/reference/skyframe#incrementality)

CodeGraphy should use both paths:

- A running extension or future daemon records file create/change/delete events as direct dirty inputs in SQLite.
- A cold `codegraphy status` performs a lightweight reconciliation: discover indexed candidates, compare path/mtime/size, and hash only new, metadata-changed, or timestamp-ambiguous files. It records direct dirty inputs but does not parse or reindex anything.
- Queries report the persisted observation state in their JSON envelope. If they did not reconcile and no live observer covers the workspace, the honest state is `unknown`, not `fresh`.

Recommended states are `missing`, `fresh`, `dirty`, `building`, and `unknown`. Include `observedAt`, `observationMethod` (`watcher` or `scan`), `completedRevision`, and direct dirty counts. An agent can then call `codegraphy status` without paying indexing cost, and every query can say whether it is returning the last complete graph or a current graph.

clangd uses the same broad split: a complete background index is cached per file, while a dynamic per-file index overlays actively edited files so definitions and references do not remain stale during editing. [clangd indexing design](https://clangd.llvm.org/design/indexing)

## Dirty, maybe-dirty, and change pruning

Walking the full reverse closure and reparsing it immediately is safe but throws away the main optimization used by established incremental systems.

Use three operational states:

- `dirty`: a direct input or computation result is known to have changed.
- `maybe_dirty`: a dependency changed, so the computation must be verified before reuse.
- `clean`: the stored result was verified for the current revision.

For each analysis computation, persist a stable output fingerprint. When a direct input changes:

1. Recompute only the directly dirty computation.
2. Compare its new output fingerprint with the previous fingerprint.
3. If equal, mark it clean in the new revision and stop propagation.
4. If different, mark only direct consumers `maybe_dirty` and verify them in turn.

Bazel calls this change pruning: invalidated dependents can be resurrected when a rebuilt value is unchanged. rustc's red-green algorithm and Salsa's backdating use the same idea: a computation with changed inputs can still be considered unchanged when its output fingerprint/value is equal, preventing downstream work. [Bazel change pruning](https://bazel.build/versions/8.4.0/reference/skyframe#incrementality) [rustc red-green algorithm](https://rustc-dev-guide.rust-lang.org/queries/incremental-compilation.html) [Salsa algorithm](https://salsa-rs.github.io/salsa/reference/algorithm.html)

For CodeGraphy, file analysis should be split into computations with narrower dependencies:

- `parse(file, plugin)` depends on file content and analyzer configuration.
- `summarize(file, plugin)` produces stable exported symbols/types and a fingerprint.
- `resolve(file, plugin)` depends on the file's parse result plus summaries of referenced targets.
- persistence owns the nodes, edges, symbols, and evidence emitted by those computations.

Example: if `a.ts` imports `b.ts` and only a comment changes in `b.ts`, parse and summarize `b.ts`; if the summary fingerprint is unchanged, do not touch `a.ts`. If an exported signature changes, `a.ts` becomes `maybe_dirty`; re-resolve it, compare its result, and propagate only if that result changed. This prevents a large connected graph from automatically becoming a full reindex.

## Proposed normalized schema

The exact names can change, but the seams should remain explicit:

```sql
CREATE TABLE IndexState (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  schemaVersion INTEGER NOT NULL,
  inputSignature TEXT NOT NULL,
  completedRevision INTEGER NOT NULL,
  observedRevision INTEGER NOT NULL,
  observerState TEXT NOT NULL,
  observedAt TEXT
);

CREATE TABLE NodeType (
  id TEXT PRIMARY KEY,
  pluginId TEXT NOT NULL,
  label TEXT NOT NULL,
  parentId TEXT REFERENCES NodeType(id),
  defaultVisible INTEGER NOT NULL CHECK (defaultVisible IN (0, 1)),
  defaultColor TEXT NOT NULL,
  description TEXT
);

CREATE TABLE EdgeType (
  id TEXT PRIMARY KEY,
  pluginId TEXT NOT NULL,
  label TEXT NOT NULL,
  defaultVisible INTEGER NOT NULL CHECK (defaultVisible IN (0, 1)),
  defaultColor TEXT NOT NULL,
  description TEXT
);

CREATE TABLE Node (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL REFERENCES NodeType(id),
  label TEXT NOT NULL,
  parentId TEXT REFERENCES Node(id)
);

CREATE TABLE File (
  nodeId TEXT PRIMARY KEY REFERENCES Node(id) ON DELETE CASCADE,
  path TEXT NOT NULL UNIQUE,
  mtime INTEGER NOT NULL,
  size INTEGER NOT NULL,
  contentHash TEXT NOT NULL
);

CREATE TABLE Symbol (
  nodeId TEXT PRIMARY KEY REFERENCES Node(id) ON DELETE CASCADE,
  fileNodeId TEXT NOT NULL REFERENCES File(nodeId) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  signature TEXT,
  startLine INTEGER,
  startColumn INTEGER,
  endLine INTEGER,
  endColumn INTEGER
);

CREATE TABLE Edge (
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
  targetId TEXT NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
  type TEXT NOT NULL REFERENCES EdgeType(id)
);

CREATE TABLE AnalysisUnit (
  id TEXT PRIMARY KEY,
  pluginId TEXT NOT NULL,
  pluginVersion TEXT NOT NULL,
  phase TEXT NOT NULL,
  fileNodeId TEXT REFERENCES File(nodeId) ON DELETE CASCADE,
  inputFingerprint TEXT NOT NULL,
  outputFingerprint TEXT NOT NULL,
  verifiedRevision INTEGER NOT NULL,
  changedRevision INTEGER NOT NULL
);

CREATE TABLE AnalysisDependency (
  consumerUnitId TEXT NOT NULL REFERENCES AnalysisUnit(id) ON DELETE CASCADE,
  producerUnitId TEXT NOT NULL REFERENCES AnalysisUnit(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL,
  kind TEXT NOT NULL,
  PRIMARY KEY (consumerUnitId, producerUnitId, kind)
);

CREATE TABLE NodeSource (
  nodeId TEXT NOT NULL REFERENCES Node(id) ON DELETE CASCADE,
  analysisUnitId TEXT NOT NULL REFERENCES AnalysisUnit(id) ON DELETE CASCADE,
  PRIMARY KEY (nodeId, analysisUnitId)
);

CREATE TABLE EdgeSource (
  id TEXT PRIMARY KEY,
  edgeId TEXT NOT NULL REFERENCES Edge(id) ON DELETE CASCADE,
  analysisUnitId TEXT NOT NULL REFERENCES AnalysisUnit(id) ON DELETE CASCADE,
  sourceFileNodeId TEXT REFERENCES File(nodeId),
  sourceKey TEXT NOT NULL,
  label TEXT NOT NULL,
  variant TEXT,
  specifier TEXT,
  startLine INTEGER,
  startColumn INTEGER,
  endLine INTEGER,
  endColumn INTEGER
);

CREATE TABLE Invalidation (
  analysisUnitId TEXT PRIMARY KEY REFERENCES AnalysisUnit(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('dirty', 'maybe_dirty')),
  reason TEXT NOT NULL,
  causedByUnitId TEXT REFERENCES AnalysisUnit(id),
  detectedRevision INTEGER NOT NULL
);
```

Known fields should be explicit columns or subtype tables such as `File` and `Symbol`. Graph Type descriptions and examples can use ordinary child tables rather than a catalog JSON document. Plugin-defined scalar metadata belongs in `NodeProperty`, `EdgeProperty`, and `EdgeSourceProperty` rows keyed by owner and property name, with separate text, numeric, and boolean value columns guarded by a value-type check. Complex plugin concepts should become nodes and edges instead of nested payloads. The core schema therefore needs no `factsJson`, `propertiesJson`, or `sourcesJson` columns.

`NodeSource` and `EdgeSource` are essential. They answer which analysis unit owns a fact, allow multiple plugins/files to support the same fact, and make targeted deletion safe. SQLite foreign keys preserve endpoint/ownership integrity, and SQLite recommends indexing child-key columns used by referential checks. [SQLite foreign keys](https://www.sqlite.org/foreignkeys.html)

Projection settings remain in `settings.json` and may be snapshotted separately for reproducibility, but Graph Scope, node/edge visibility, search, and result filters must not be included in `inputSignature`. The signature includes only inputs that change analysis facts: discovery exclusions, enabled analyzers/plugins and versions, analyzer configuration, and schema/analysis versions.

## Targeted transactional patching

Analysis should happen outside the SQLite write transaction. Once a delta is ready, one short transaction should:

1. remove `NodeSource` and `EdgeSource` rows owned by recomputed units;
2. remove graph facts that no longer have any source;
3. upsert new nodes, edges, symbols, sources, unit fingerprints, and dependency edges;
4. clear completed invalidations and advance `completedRevision`;
5. commit atomically.

Unrelated graph rows are never deleted. Separate database connections see only committed transactions; in WAL mode, readers continue seeing the previous snapshot while the writer prepares and commits the new one. This gives the desired contract: the last complete graph remains queryable while freshness says it is dirty, then the new complete revision becomes visible at commit. [SQLite isolation](https://www.sqlite.org/isolation.html)

Watcher events that arrive during analysis receive a later `observedRevision` and remain queued for the next pass. Before committing, the indexer should verify that the direct inputs it analyzed still match their recorded content hashes; otherwise it discards or retries that unit's delta instead of falsely clearing freshness.

For deletions, keep the deleted file's analysis unit as a tombstone until its consumers have been marked and its owned facts have been patched. Removing the file row first would cascade away the dependency evidence needed to find those consumers.

## Cycles and conservative fallback

The workspace graph may be cyclic, and file imports commonly are. Do not expand a cycle repeatedly through a queue. Condense the analysis-dependency graph into strongly connected components and treat each component as one invalidation unit. Recompute the affected component, compare its aggregate stable output fingerprint, and propagate across component boundaries only when that output changed.

When a plugin analysis inside a cycle is monotone and has a finite value domain, fixed-point iteration is valid. Salsa explicitly constrains fixed-point cycle recovery to monotone computations that are guaranteed to converge. Otherwise the safe fallback is to recompute the whole component, or the whole plugin/workspace when a plugin declares untracked dependencies. [Salsa cycle handling](https://salsa-rs.github.io/salsa/cycles.html)

## Recommended next implementation slice

1. Replace `factsJson` with `File`, `Symbol`, `AnalysisUnit`, source/evidence, and dependency tables.
2. Make `status` reconcile filesystem inputs and add `unknown` when neither a scan nor live watcher can prove freshness.
3. Add output fingerprints and `dirty`/`maybe_dirty` change pruning before optimizing graph writes.
4. Replace whole-table `Node`/`Edge` rewrites with owner-based transactional deltas.
5. Add SCC grouping and plugin escalation only after acyclic direct-dependency behavior is proven.

The first behavioral tests should cover: a comment-only producer edit stops at its summary; an exported signature change re-resolves direct consumers; a removed import deletes its edge; a deleted target invalidates consumers; toggling Graph Scope causes zero analysis/cache writes; a cold CLI edit makes `status` dirty; and a watcher event arriving during indexing remains pending after the commit.
