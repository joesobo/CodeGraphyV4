---
'@codegraphy-dev/core': minor
'@codegraphy-dev/plugin-markdown': patch
---

Make the CLI self-describing for agents, return data and errors in a stable JSON envelope, and store files, symbols, and relations as clearly named, queryable SQLite records. Index symbols once regardless of Graph Scope so later visibility changes do not require reindexing. Prevent the bundled Markdown plugin from creating garbage wikilink relations from binary files.
