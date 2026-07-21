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

- `File(id, path, size, contentHash)` stores one row per indexed workspace
  file. `path` is the stable workspace-relative identity; the generated `id`
  is used by foreign keys.
- `Node` stores files, folders, packages, symbols, and plugin concepts. A node
  references its owning `File` and parent `Node` through generated integer
  identifiers. Stable graph identity remains a separate unique `key`. The
  remaining columns are `type`, `label`, `color`, `x`, `y`, `favorite`,
  `shape`, `imageUrl`, `isCollapsed`, `pluginId`, and `language`.
- `Symbol` stores the optional symbol subtype of a `Node` as a one-to-one row.
  Its complete contract is `nodeId`, `name`, `kind`, `pluginId`, and
  `language`. File ownership is obtained through the referenced `Node`; it is
  not duplicated on `Symbol`.
- `Edge` stores directed typed relationships between `Node` rows. Each physical
  row has only `id`, stable `key`, `sourceNodeId`, `targetNodeId`, and `type`.
  Source and target are generated `Node.id` foreign keys. Edge ownership is
  derived from its endpoints instead of duplicated in an `ownerFileId`.

The schema does not use JSON columns and does not persist analyzer bookkeeping,
source provenance, source ranges, renderer physics, Unity-specific fields, or
duplicated paths and identities. `INTEGER PRIMARY KEY` provides
database-generated row identities without `AUTOINCREMENT`; domain keys such as
paths remain unique ordinary columns. When one node is both a plugin node and a
symbol, `Symbol.nodeId` points to that existing `Node` instead of creating a
duplicate node.

The persisted Relationship Graph is the source of truth. Runtime analysis
objects needed by existing Core indexing paths are reconstructed minimally from
the four tables and relational joins; removed analyzer details are not recreated.
Every persisted file record represents a completed core analysis, including an
empty symbol result, so per-collection `*Indexed` flags are unnecessary.

Indexing stores complete nodes, symbols, and edges independently of Filters,
Graph Scope, and edge visibility. Those settings shape extension display and
CLI query results without requiring a new index. `contentHash` allows an
explicit later index to validate file reuse without persisting modification
times; it is not exposed as a stale row flag. The CLI keeps indexing explicit
for now. Automatic stale notifications, watchers, and background reindexing are
separate future work; the extension may continue responding to editor lifecycle
events through its Core indexing path.

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
