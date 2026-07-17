---
'@codegraphy-dev/core': minor
'@codegraphy-dev/extension': patch
'@codegraphy-dev/plugin-markdown': patch
---

Make the CLI self-describing for agents, return data and errors in a stable JSON envelope, expose resumable pagination and bounded-path completeness, and store indexing state plus the complete property graph in queryable `IndexedFile`, `Node`, and `Edge` SQLite tables. Persist raw per-file facts separately from the derived graph so an edit reanalyzes only changed or plugin-invalidated files while connected symbol edges are resolved again from current facts. Index graph facts once regardless of Graph Scope so later visibility changes do not require reindexing. Expand doctor with cache metadata and graph record counts, keep freshly indexed caches fresh when configured plugins are unavailable, and persist the complete graph when indexing through the extension. Prevent the bundled Markdown plugin from creating garbage wikilink relations from binary files.
