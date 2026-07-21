# SQLite Replaces LadybugDB Without Moving Graph Query

**Status:** Accepted

The workspace-local **Graph Cache** will use SQLite instead of LadybugDB.
This change replaces the persistence package and file format while preserving
the existing Core storage API, in-memory **Graph Query**, and **Relationship
Graph** projection behavior.

**Considered Options**

- Replace LadybugDB with SQLite and move dependency traversal, filtering,
  search, and impact queries into SQL. This could reduce data loaded for some
  future agent queries, but it combines a storage migration with a query-engine
  redesign and makes result parity harder to establish.
- Replace LadybugDB with SQLite behind the existing Core storage contracts.
  Continue loading snapshots and cache records into the current Graph Query and
  graph projection paths. This isolates the migration and lets CLI and Agent
  Skill work proceed against unchanged graph semantics.

**Decision**

Use SQLite only as the Graph Cache persistence engine in this upgrade. Keep
Graph Query, Graph Scope, filtering, traversal, folder/package projection, and
Visible Graph behavior in their current Core-owned in-memory paths.

Use `libsql` 0.5.29 as the Node binding. Its local database API is synchronous
and compatible with the storage contract, its files use the standard SQLite
format when libSQL extensions are not used, and its prebuilt Neon native
packages register through Node-API. The Node-API boundary is required because
the same extension artifact runs inside VS Code's Electron runtime, whose V8
ABI differs from the Node runtime used to build the package.

Do not introduce SQL-native graph traversal, FTS, semantic search, or a new
query model as part of the LadybugDB replacement. Those may be evaluated later
as independent, measured changes.

Persist the Graph Cache as four relational tables:

- `File` stores one row per indexed workspace file, including the cache path,
  analyzer path, filesystem identity, and content hash.
- `Node` stores files, folders, packages, symbols, and plugin concepts. A node
  references its owning `File` and parent `Node` through generated integer
  identifiers. Stable graph identity remains a separate unique `key`.
- `Symbol` stores the optional symbol subtype of a `Node` as a one-to-one row.
  Symbol identity, source range, and supported plugin metadata use explicit
  typed columns, so non-symbol nodes do not carry nullable symbol fields.
  `filePath` belongs to every symbol; nullable `analysisId`, `analysisPath`,
  and `analysisOrder` distinguish analyzer facts from graph-only presentation
  without allowing graph rows to become analyzer facts on the next index.
- `Edge` stores directed typed relationships between `Node` rows. Each physical
  row stores one contributing source, while `graphKey` groups rows that form
  one canonical multi-source graph edge. `sourceNodeId`, `targetNodeId`, and
  `ownerFileId` are integer foreign keys. Raw analysis relation fields and
  source provenance use separate explicit columns.

The schema does not use JSON columns. Facts needed for identity, joins,
filtering, ownership, provenance, or cache reconstruction remain ordinary
SQLite values with foreign keys and indexes. `INTEGER PRIMARY KEY` provides
database-generated row identities without `AUTOINCREMENT`; domain keys such as
paths and plugin identifiers remain unique ordinary columns. When one node is
both a plugin node and a symbol, `Symbol.nodeId` points to that existing `Node`
instead of creating a duplicate node.

Every persisted file record represents a completed core analysis, including an
empty symbol result, so per-collection `*Indexed` flags are unnecessary. Active
plugin tiers are restored only after the existing settings and plugin
signatures have validated the cache. `canonicalGraphEdge` distinguishes a raw
analysis relation that must remain queryable from an edge that belongs in the
canonical Relationship Graph.

Discovery Filters define which files belong in an index and can reduce indexing
work. Once a file is selected, indexing stores its complete nodes, symbols, and
edges independently of Graph Scope and edge visibility. Graph Scope and edge
visibility shape extension display and CLI query results without requiring a
new index. The CLI keeps indexing explicit for now. Automatic stale
notifications, watchers, and background reindexing are separate future work;
the extension may continue responding to editor lifecycle events through its
Core indexing path.

**Consequences**

- Storage parity can be verified independently from CLI query design.
- VSIX releases vendor the host platform's `@libsql/*` Node-API binary and
  validate a real in-memory query round trip, avoiding an Electron rebuild.
- Extension and CLI continue consuming the same Core APIs.
- SQLite schema and indexes should optimize current save, patch, and snapshot
  reads rather than speculative future queries.
- Old Graph Cache schemas are rebuilt into the current four-table contract;
  there is no legacy JSON read path.
- The migration will not by itself reduce Graph Query memory usage or CLI
  response size.
- Later agent-oriented tools may reuse the SQLite data, but they must not be
  prerequisites for completing this storage migration.
