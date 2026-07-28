---
name: codegraphy
description: Understand and operate the CodeGraphy CLI for workspace source, symbol, and relationship exploration.
---

# CodeGraphy

CodeGraphy represents a workspace as a **Relationship Graph**. Nodes identify Files, Folders, Packages, AST Symbols, and plugin-defined concepts. Directed Edges identify relationships such as imports, reexports, calls, references, inheritance, and containment. Edge direction and type explain why two Nodes are connected.

The graph is navigation evidence. Static relationships can identify ownership and possible change surfaces, but they do not prove runtime behavior. Source, tests, generated behavior, dynamic dispatch, and unsupported language semantics can add facts that are absent from the graph.

## Graph lifecycle and freshness

`codegraphy index` discovers eligible workspace files, runs built-in and enabled Plugin analysis, and creates or incrementally updates `.codegraphy/graph.sqlite`. The Graph Cache stores complete indexed facts before Graph Scope and path Filters shape query results.

`codegraphy watch` performs that synchronization and remains in the foreground with the workspace engine resident in memory. Workspace events are debounced into serialized incremental updates, while file creation, deletion, renaming, Git ignore changes, and workspace settings changes can trigger rediscovery. Cache artifacts and active Filter matches are skipped. Changes that arrive during an update remain pending for another batch, simultaneous Graph Cache writers are coordinated, and interrupting the watcher persists its pending batch before shutdown. After the first Graph Cache exists, the VS Code Extension feeds its workspace events into the same Core updating behavior so the cache remains current while the Graph View is closed; it does not implicitly perform the first Index, and a separate CLI watcher is not required for that Extension-owned workspace lifecycle.

`codegraphy filter` changes persisted path exclusions without rebuilding cached analysis. `codegraphy scope` changes which Node Types and Edge Types appear in the shaped graph. `codegraphy settings` exposes workspace discovery, indexing, filter, scope, Plugin, and interface settings; settings mutations report whether another Index is required. `codegraphy plugins` controls installed Plugin registration and activation.

Query with any read-only graph command after a Graph Cache exists. A `graph_cache_not_found` result means that no indexed snapshot is available. `codegraphy status` reports supported missing, stale, and fresh cache conditions. `codegraphy doctor` checks runtime, settings, cache, and Plugin health and includes recovery information for unhealthy checks.

Most Symbols and Relationships are cached. Search also reads current source text from eligible indexed File Nodes. A single response can therefore contain `freshness: "live"` source matches and cached Symbol matches whose `cacheState` is `fresh` or `stale`. Indexing and live updates are what make changed AST and Relationship facts current; the watcher does not change the already-live source-text behavior.

## Query surfaces

| Command | Information returned |
|---|---|
| `search <pattern>` | One ranked result set merging live source locations, cached AST Symbols, and indexed Nodes. |
| `map <task>` | A compact task-personalized File map with matched terms, selected declarations, and typed connecting Relationships. |
| `query <node>` | A bounded overview of one exact File or Symbol Node, with prioritized declarations and incoming and outgoing Relationships. |
| `nodes` | A paginated Node inventory from the shaped graph. |
| `edges` | A paginated Relationship inventory from the shaped graph. |
| `dependencies <node>` | Outgoing Relationships from a File path or exact Node ID. |
| `dependents <node>` | Incoming Relationships to a File path or exact Node ID. |
| `path <from> <to>` | A bounded Relationship route between two File paths or exact Node IDs. |

Inventory reports reflect persisted Graph Scope. Search, exact Target Query, Path, and targeted relationship selectors use complete cached Node and Edge Types unless an invocation explicitly projects a dimension with `--node-type` or `--edge-type`. Path Filters still apply.

`--filter`, `--node-type`, and `--edge-type` are one-off query projections and do not modify `.codegraphy/settings.json`. Persisted Filter and Scope changes affect later commands without deleting the complete cached facts.

## Search and target identity

Search literal matching is case-insensitive. `*` is a line-local wildcard over source, names, and paths. A whitespace-containing phrase with sparse literal matches can also produce deterministic File candidates whose paths or source contain all query terms. Search is lexical rather than a semantic-answer engine.

Source matches include File path, line, column, excerpt, and live freshness. Symbol matches include an exact Symbol ID and source location. Node matches include exact Node identity. An exact File path or Symbol ID from these results can address Target Query and relationship commands; a display label is not necessarily a Node ID.

Search, inventories, overviews, and relationship reports are bounded. Pagination uses `page` metadata recording offset, limit, returned count, total count, and `nextOffset` when another page exists. Target Query reports independent declaration and relationship bounds. Path reports include traversal limits and a `complete` boolean; `complete: false` means the configured search bound was reached before the entire search space was exhausted.

## Machine-readable contract

Normal command results are JSON envelopes. Successful data is written to stdout. Operational and invalid-invocation failures use structured error envelopes on stderr and nonzero exit statuses. `--verbose` adds lifecycle diagnostics to stderr without changing the data envelope.

The foreground watcher streams JSON Lines envelopes for readiness, updating, updated, recoverable error, and stopped events. Event batches report bounded file paths, totals, completeness, update duration, and full-versus-incremental Indexing metrics.

Common error codes distinguish invalid arguments, missing or stale workspace state, an exact target that is absent, malformed settings, and operational failures. Error `details` and `actions` carry command-specific recovery context when available.

## Interpretation limits

- Graph coverage depends on eligible files, the indexing file budget, enabled Plugins, supported languages, and analyzer capabilities.
- Persisted Filters and Graph Scope can intentionally hide facts from broad inventories.
- Live text and cached structural facts can have different freshness in the same result.
- Imports, calls, references, and inferred or plugin-defined Edges have different semantics; an Edge Type should be interpreted rather than treated as generic proximity.
- Incoming Relationships suggest consumers or possible impact, while outgoing Relationships suggest dependencies; neither alone defines the complete edit set.
- Hubs, barrels, generated files, tests, and shared utilities can have many legitimate Relationships and can dominate broad graph results.
- Bounded or paginated output is not evidence that omitted results do not exist.

Current command syntax, options, and examples are available from `codegraphy --help` and `codegraphy <command> --help`.
