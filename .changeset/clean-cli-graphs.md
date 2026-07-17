---
'@codegraphy-dev/core': minor
'@codegraphy-dev/plugin-markdown': patch
---

Make the CLI self-describing for agents, return data and errors in a stable JSON envelope, and store indexing state plus the complete property graph in queryable `IndexedFile`, `Node`, and `Edge` SQLite tables. Index graph facts once regardless of Graph Scope so later visibility changes do not require reindexing. Expand doctor with cache metadata and graph record counts, and keep freshly indexed caches fresh when configured plugins are unavailable. Prevent the bundled Markdown plugin from creating garbage wikilink relations from binary files.
