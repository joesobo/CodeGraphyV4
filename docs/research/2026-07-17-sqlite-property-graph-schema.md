# SQLite Property Graph Schema

## Question

How should CodeGraphy persist a complete Relationship Graph in SQLite while keeping indexing bookkeeping and plugin capability metadata understandable?

## Findings

Established property-graph models describe graph instances with nodes, directed edges, labels or types, and properties. TinkerPop calls this a directed, attributed multigraph and makes vertices and edges the two structural element kinds. Neo4j likewise defines nodes as entities and relationships as directed, typed connections between a source and target; both can carry properties. Neither model requires a separate instance table for every node or edge type.

Sources:

- [Apache TinkerPop reference: graph structure](https://tinkerpop.apache.org/docs/current/reference/#graph-structure)
- [Neo4j graph database concepts](https://neo4j.com/docs/getting-started/appendix/graphdb-concepts/)
- [Neo4j store formats](https://neo4j.com/docs/operations-manual/current/database-internals/store-formats/)

CodeGraphy's Node Type Definitions and Edge Type Definitions contain labels, visibility defaults, colors, explanations, and examples. They describe capabilities and presentation, not graph instances. They belong to the Core/plugin capability registry. If the CLI needs an offline snapshot of those definitions, store one catalog document in index metadata rather than repeating definitions per analyzed file or treating them as graph elements.

SQLite foreign keys can enforce that every edge endpoint exists, but enforcement must be enabled for every connection with `PRAGMA foreign_keys = ON`. SQLite recommends indexes on child-key columns because referential checks otherwise require linear scans. For graph access, indexes should cover edge source and target lookups, with type included only where measured queries constrain both fields.

Sources:

- [SQLite foreign key support](https://www.sqlite.org/foreignkeys.html)
- [SQLite query planning](https://www.sqlite.org/queryplanner.html)

SQLite JSON is appropriate for sparse, plugin-defined properties that are returned as a whole. Frequently filtered, joined, constrained, or sorted values should remain ordinary columns. SQLite JSONB can reduce parse cost and storage size, but SQLite documents most JSONB operations as O(N), so it is not a replacement for relational columns or indexes.

Source: [SQLite JSON functions and JSONB](https://www.sqlite.org/json1.html)

## Recommended Model

```sql
CREATE TABLE IndexedFile (
  path TEXT PRIMARY KEY,
  mtime INTEGER NOT NULL,
  size INTEGER NOT NULL,
  contentHash TEXT,
  factsJson TEXT
);

CREATE TABLE Node (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  label TEXT NOT NULL,
  filePath TEXT,
  parentId TEXT,
  propertiesJson TEXT,
  FOREIGN KEY (parentId) REFERENCES Node(id) ON DELETE CASCADE
);

CREATE TABLE Edge (
  id TEXT PRIMARY KEY,
  sourceId TEXT NOT NULL,
  targetId TEXT NOT NULL,
  type TEXT NOT NULL,
  propertiesJson TEXT,
  sourcesJson TEXT,
  FOREIGN KEY (sourceId) REFERENCES Node(id) ON DELETE CASCADE,
  FOREIGN KEY (targetId) REFERENCES Node(id) ON DELETE CASCADE
);

CREATE INDEX Edge_source_type_idx ON Edge(sourceId, type);
CREATE INDEX Edge_target_type_idx ON Edge(targetId, type);
CREATE INDEX Node_type_idx ON Node(type);
CREATE INDEX Node_filePath_idx ON Node(filePath);
```

`IndexedFile` is operational cache state, not part of the graph. `Node` contains files, folders, packages, symbols, and plugin-defined concepts. `Edge` contains structural and semantic relationships, including plugin-defined relationships. Symbols and relations should not have parallel persistence tables once the canonical graph is stored.

Type and capability definitions should remain in the registry/settings model. A single optional metadata snapshot may support offline help and diagnostics, but it should not be joined into ordinary traversal.

## Consequences

- Indexing must build and persist the full canonical graph independently of Graph Scope and visibility settings.
- Graph Scope, filters, search, and view settings project from persisted nodes and edges without reindexing.
- Discovery exclusions that prevent files from being indexed remain reindex-requiring inputs and should be named separately from projection filters.
- SQLite remains a persistence adapter behind Core's existing Graph Query interface, consistent with ADR 0002.
- Before adding indexes beyond endpoint/type lookups, measure the actual CLI query plans with `EXPLAIN QUERY PLAN`.
