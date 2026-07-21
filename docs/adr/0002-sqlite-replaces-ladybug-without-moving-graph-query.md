# SQLite replaces LadybugDB without moving Graph Query

**Status:** Accepted

The workspace-local **Graph Cache** will use SQLite instead of LadybugDB. This change replaces the persistence package and file format while preserving the Core storage API, in-memory **Graph Query**, and **Relationship Graph** projection behavior.

**Considered Options**

- Replace LadybugDB with SQLite and move dependency traversal, filtering, search, and impact queries into SQL. This option could reduce loaded data for some future agent queries. It would also combine a storage migration with a query-engine redesign and make result parity harder to establish.
- Replace LadybugDB with SQLite behind the existing Core storage contracts. Continue loading snapshots and cache records into the current Graph Query and graph projection paths. This option isolates the migration and lets CLI and Agent Skill work continue with unchanged graph semantics.

**Decision**

Use SQLite as the Graph Cache persistence engine in this upgrade. Keep Graph Query, Graph Scope, filtering, traversal, folder and package projection, and Visible Graph behavior in their current Core-owned in-memory paths.

Use `libsql` 0.5.29 as the Node binding. Its synchronous local database API matches the storage contract. Its files use the standard SQLite format without libSQL extensions. Its prebuilt Neon native packages register through Node-API. The extension needs this Node-API boundary because VS Code's Electron runtime and the build-time Node runtime use different V8 application binary interfaces (ABIs).

Do not add SQL-native graph traversal, full-text search (FTS), semantic search, or a new query model to the LadybugDB replacement. Evaluate them later as separate, measured changes.

Persist the Graph Cache as five relational tables. All five tables use SQLite
`STRICT` mode so invalid storage types fail at the write boundary.

- `File(id, path, mtime, size, contentHash)` stores one row per indexed
  workspace file. `path` is the stable workspace-relative identity; the
  generated `id` is used by foreign keys. `mtime` avoids reading and hashing
  unchanged files after cache hydration. The content hash handles ambiguous
  filesystem timestamps.
- `Node` stores files, folders, packages, symbols, and plugin concepts. A node
  references its owning `File` and parent `Node` through generated integer
  identifiers. Stable graph identity remains a separate unique `key`. The
  remaining columns are `type`, `label`, `pluginId`, and `language`.
- `NodeView` stores display state by stable `Node.key`: `color`, `x`, `y`,
  `favorite`, `shape`, `imageUrl`, and `isCollapsed`. It does not reference the
  generated `Node.id`. This lets display state survive a fact-table rebuild.
  `favorite` and `isCollapsed` are non-null integers with a default of `0`.
- `Symbol` stores the optional symbol subtype of a `Node` as a one-to-one row.
  Its complete contract is `nodeId`, `name`, `kind`, `pluginId`, and
  `language`. File ownership is obtained through the referenced `Node`; it is
  not duplicated on `Symbol`. Runtime graph projection derives built-in scope
  matching fields from the stored plugin, language, and symbol kind values.
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
the five tables and relational joins; removed analyzer details are not recreated.
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

- Verify storage parity apart from CLI query design.
- VSIX releases include the host platform's `@libsql/*` Node-API binary and validate an in-memory query round trip without an Electron rebuild.
- Extension and CLI continue consuming the same Core APIs.
- SQLite schema and indexes should optimize current save, patch, and snapshot reads.
- Old Graph Cache fact schemas are rebuilt into the current five-table contract.
  A compatible `NodeView` table is retained during later fact-schema rebuilds;
  there is no legacy JSON read path.
- Full saves prune `NodeView` rows whose stable graph keys are absent after all
  live nodes are inserted. An explicit cache clear retains compatible view
  state so rebuilding the same stable keys can restore the layout.
- The migration will not reduce Graph Query memory usage or CLI response size by itself.
- Later agent tools may reuse the SQLite data, but this storage migration must not depend on them.
