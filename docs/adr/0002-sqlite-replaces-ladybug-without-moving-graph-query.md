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

**Consequences**

- Verify storage parity apart from CLI query design.
- VSIX releases include the host platform's `@libsql/*` Node-API binary and validate an in-memory query round trip without an Electron rebuild.
- Extension and CLI continue consuming the same Core APIs.
- SQLite schema and indexes should optimize current save, patch, and snapshot reads.
- The migration will not reduce Graph Query memory usage or CLI response size by itself.
- Later agent tools may reuse the SQLite data, but this storage migration must not depend on them.
