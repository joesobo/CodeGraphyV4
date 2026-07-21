---
'@codegraphy-dev/core': minor
'@codegraphy-dev/extension': patch
'@codegraphy-dev/plugin-markdown': patch
---

Make the CLI self-describing for agents, return data and errors in a stable JSON envelope, expose resumable pagination and bounded-path completeness, and add one-off Filter, Node Type, and Edge Type projections that do not change workspace settings. Store file state plus the complete property graph in compact, queryable `File`, `Node`, `Symbol`, and `Edge` SQLite tables with generated row identities and enforced foreign keys. Index nodes, symbols, and edges once regardless of Graph Scope so later visibility changes do not require reindexing. Expand doctor with cache metadata and graph record counts, keep freshly indexed caches fresh when configured plugins are unavailable, and persist the complete graph when indexing through the extension. Prevent the bundled Markdown plugin from creating garbage wikilink relations from binary files.
