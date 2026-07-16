# SQLite Replaces LadybugDB Without Moving Graph Query

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

**Consequences**

- Storage parity can be verified independently from CLI query design.
- VSIX releases vendor the host platform's `@libsql/*` Node-API binary and
  validate a real in-memory query round trip, avoiding an Electron rebuild.
- Extension and CLI continue consuming the same Core APIs.
- SQLite schema and indexes should optimize current save, patch, and snapshot
  reads rather than speculative future queries.
- The migration will not by itself reduce Graph Query memory usage or CLI
  response size.
- Later agent-oriented tools may reuse the SQLite data, but they must not be
  prerequisites for completing this storage migration.
