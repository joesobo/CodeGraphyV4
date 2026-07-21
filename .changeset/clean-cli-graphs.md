---
'@codegraphy-dev/core': minor
'@codegraphy-dev/extension': patch
'@codegraphy-dev/plugin-markdown': patch
---

Make the CLI self-describing for agents, return data and errors in a stable JSON envelope, expose resumable pagination and bounded-path completeness, and add one-off Filter, Node Type, and Edge Type projections that do not change workspace settings. Store file state, graph facts, and stable view state in compact, queryable `File`, `Node`, `NodeView`, `Symbol`, and `Edge` SQLite tables with generated row identities and enforced foreign keys. Index nodes, symbols, and edges once regardless of Graph Scope so later visibility changes do not require reindexing. Expand doctor with cache metadata and graph record counts, keep freshly indexed caches fresh when configured plugins are unavailable, persist the complete graph when indexing through the extension, and prune view state for graph keys removed by a full save. Prevent binary files from reaching analyzers while avoiding binary sampling I/O for known text formats.
