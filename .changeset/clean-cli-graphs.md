---
'@codegraphy-dev/core': minor
'@codegraphy-dev/plugin-markdown': patch
---

Make the CLI self-describing for agents, return data and errors in a stable JSON envelope, and store files, nodes, graph types, symbols, and relations as clearly named, queryable SQLite records. Index graph facts once regardless of Graph Scope so later visibility changes do not require reindexing. Expand doctor with cache metadata and record counts, and keep freshly indexed caches fresh when configured plugins are unavailable. Prevent the bundled Markdown plugin from creating garbage wikilink relations from binary files.
