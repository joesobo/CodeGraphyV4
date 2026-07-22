---
'@codegraphy-dev/core': minor
'@codegraphy-dev/extension': patch
'@codegraphy-dev/plugin-markdown': patch
---

- Make CLI help self-contained for agents. Return exclusive success or error envelopes, resumable pagination, bounded-path completeness, and one-off Filter, Node Type, and Edge Type projections with semantic parent, descendant, and overlapping Node Type matches.
- Store file state, complete graph facts, and stable view state in compact `File`, `Node`, `NodeView`, `Symbol`, and `Edge` SQLite tables. Preserve file modification times for fast cache reuse, enforce foreign keys, and retain compatible view state across schema rebuilds.
- Index Nodes, Symbols, and Edges once regardless of Graph Scope. Extend doctor with cache metadata, integrity, foreign-key health, and record counts, keep a new index fresh when configured Plugins are unavailable, and persist the complete extension graph.
- Prevent binary files from reaching analyzers. Skip binary sampling I/O for known text formats.
