---
name: codegraphy
description: CodeGraphy CLI reference for indexed source ownership, symbols, dependencies, dependents, paths, freshness, and graph shaping.
---

# CodeGraphy

CodeGraphy represents a workspace as a **Relationship Graph**. Nodes identify Files, Folders, Packages, AST Symbols, and plugin-defined concepts. Directed typed Edges identify imports, reexports, calls, references, inheritance, containment, and plugin-defined relationships.

Ordinary source tools expose text and files. CodeGraphy can add exact graph identity, cached structure, and typed direction: what a target uses, what uses it, and whether a route connects two targets. Both are navigation evidence rather than proof of runtime behavior.

## Evidence surfaces

| Information question | Command and result |
|---|---|
| Where does this literal, name, or path occur? | `search <pattern>` merges current source locations, cached AST Symbols, and indexed Nodes. |
| What is known about this exact target? | `query <node>` returns one exact File or Symbol, prioritized declarations, and incoming and outgoing Relationships. |
| What does this target use? | `dependencies <node>` returns outgoing Relationships. |
| What uses this target? | `dependents <node>` returns incoming Relationships. |
| Is there a directed route between two targets? | `path <from> <to>` returns bounded Relationship paths. |
| What graph facts exist in the current shape? | `nodes` and `edges` return paginated inventories. |

A target can be a workspace-relative File path or an exact Node ID. Symbol IDs and source locations appear in Search and Target Query results. A display label is not necessarily a Node ID.

These surfaces are composable with each other and with ordinary source tools. There is no required command order or call count; the relevant evidence type, repository state, and task determine what information is useful.

## Graph lifecycle and state

`codegraphy index` discovers eligible files, runs built-in and enabled Plugin analysis, and creates or incrementally updates `.codegraphy/graph.sqlite`. The Graph Cache stores complete indexed facts before Graph Scope and path Filters shape results.

`codegraphy filter` changes persisted path exclusions. `codegraphy scope` changes which Node Types and Edge Types appear in the shaped graph. Neither operation deletes complete cached facts. `codegraphy settings` exposes discovery, indexing, Filter, Scope, Plugin, and interface settings; mutations report whether another Index is required. `codegraphy plugins` controls installed Plugin registration and activation.

Query with any read-only graph command after a Graph Cache exists. `graph_cache_not_found` means no indexed snapshot is available. `codegraphy status` reports supported missing, stale, and fresh cache conditions. `codegraphy doctor` checks runtime, settings, cache, and Plugin health and returns recovery information for unhealthy checks.

Most Symbols and Relationships are cached. Search also reads live source text from eligible indexed File Nodes. One response can therefore contain `freshness: "live"` text matches and cached Symbol matches whose `cacheState` is `fresh` or `stale`. Indexing makes changed AST and Relationship facts current.

## Search, shaping, and bounds

Search literal matching is case-insensitive. `*` is a line-local wildcard over source, names, and paths. A whitespace-containing phrase with sparse literal matches can also produce deterministic File candidates whose paths or source contain all query terms. Search is lexical rather than a semantic-answer engine.

Source matches include File path, line, column, excerpt, and freshness. Symbol matches include exact identity and source location. Search, exact Target Query, Path, and targeted Relationship selectors use complete cached Node and Edge Types. Broad inventories reflect persisted Graph Scope. Path Filters apply to both. Explicit `--node-type` and `--edge-type` options project that dimension for one invocation; `--filter` adds a one-off path projection. These options do not modify `.codegraphy/settings.json`.

Search, inventories, Target Query sections, Relationships, and Path are bounded. Pagination metadata records offset, limit, returned count, total count, and `nextOffset`. Path includes traversal limits and `complete`; `complete: false` means a bound was reached before exhausting the search space.

## Machine-readable contract

Normal command results are JSON envelopes. Success data is written to stdout. Operational and invalid-invocation failures use structured error envelopes on stderr and nonzero exit statuses. `--verbose` adds lifecycle diagnostics to stderr without changing the data envelope. Error `details` and `actions` carry command-specific recovery context when available.

## Interpretation limits

- Coverage depends on eligible files, the indexing budget, enabled Plugins, supported languages, and analyzer capabilities.
- Live text and cached structural facts can have different freshness.
- Static Relationships do not capture every runtime call, generated behavior, dynamic dispatch, or unsupported semantic.
- Edge Type and direction carry meaning; generic proximity is not a substitute for that meaning.
- Hubs, barrels, tests, generated files, and shared utilities can have many legitimate Relationships.
- Bounded output does not imply that omitted facts do not exist.

Current syntax and examples are available from `codegraphy --help` and `codegraphy <command> --help`.
