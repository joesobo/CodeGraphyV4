---
name: codegraphy
description: Explore workspace source identities and typed incoming, outgoing, and path relationships with the CodeGraphy CLI.
---

# CodeGraphy

CodeGraphy represents a workspace as a **Relationship Graph**. Nodes identify Files, Folders, Packages, AST Symbols, and Plugin-defined concepts. Directed Edges identify typed relationships such as imports, reexports, calls, references, inheritance, and containment. Edge direction and type explain why Nodes are connected.

The graph is navigation evidence, not proof of runtime behavior. Source, tests, generated behavior, dynamic dispatch, and unsupported language semantics can contain facts absent from static analysis.

## Cache and freshness

`codegraphy index` discovers eligible workspace files and builds or incrementally updates `.codegraphy/graph.sqlite`. This **Graph Cache** stores complete indexed facts before Filters and Graph Scope shape results. `codegraphy filter` changes persisted path exclusions; `codegraphy scope` changes visible Node and Edge Types.

Query with read-only commands after a Graph Cache exists. `codegraphy status` reports supported missing, stale, and fresh states. `codegraphy doctor` checks settings, runtime, Plugins, and cache health. Most Symbols and Relationships are cached. Search also reads **live source** text from eligible indexed File Nodes. One search can therefore contain live source matches and cached Symbol matches whose `cacheState` is fresh or stale. Indexing refreshes changed AST and Relationship facts.

## Query capabilities

| Command | Returned evidence |
|---|---|
| `search <pattern>` | Ranked live source locations, cached AST Symbols, and indexed Nodes. |
| `query <node>` | A bounded exact File or Symbol overview with declarations and typed incoming and outgoing Relationships. |
| `dependencies <node>` | Outgoing Relationships from an exact File path or Node ID. |
| `dependents <node>` | Incoming Relationships to an exact File path or Node ID. |
| `path <from> <to>` | Bounded typed routes between exact File paths or Node IDs. |
| `nodes` | Paginated Node inventory. |
| `edges` | Paginated Relationship inventory. |

Search literal matching is case-insensitive, `*` is a line-local wildcard, and multi-term phrases can return Files containing every term. Search is lexical, not a semantic-answer engine.

Source matches include path, line, column, excerpt, and live freshness. Symbol matches include exact Symbol IDs and locations. Exact File paths and Symbol IDs address Target Query and relationship commands; display labels are not necessarily Node IDs.

## Shaping and bounds

Inventory reports reflect persisted Graph Scope. Search, exact Target Query, Path, and targeted relationship selectors use complete cached Node and Edge Types unless an invocation explicitly projects a dimension with `--node-type` or `--edge-type`. Path Filters still apply. One-off projections do not modify workspace settings.

Reports are bounded. Pagination metadata includes offset, limit, returned count, total count, and `nextOffset`. Target Query bounds declarations and each Relationship direction independently. Path results include traversal limits and `complete`; `complete: false` means a configured bound stopped exploration before the search space was exhausted.

## Machine contract and limits

Normal results are JSON envelopes on stdout. Failures use structured error envelopes on stderr with nonzero exit status. `--verbose` adds stderr diagnostics.

Coverage depends on eligible files, the indexing file budget, enabled Plugins, supported languages, analyzer capabilities, Filters, and Graph Scope. Edge Types have distinct semantics. Incoming Relationships suggest consumers or possible impact; outgoing Relationships suggest dependencies. Hubs, barrels, generated files, tests, and shared utilities can legitimately dominate broad results. Bounded output does not imply omitted evidence is absent.

Current syntax and examples are available from `codegraphy --help` and `codegraphy <command> --help`.
