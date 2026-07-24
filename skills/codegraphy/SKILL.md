---
name: codegraphy
description: Use the CodeGraphy CLI to discover source, AST Symbols, and Relationships in a prepared workspace graph.
---

# CodeGraphy

Use CodeGraphy to identify the smallest set of source files worth reading. It provides navigation evidence, not a substitute for source inspection.

## Fast workflow

1. Start with useful evidence instead of a preparatory status call:
   - `search <pattern>` discovers an identifier, path, or exact source phrase.
   - `query <node>` inspects one exact File path or Symbol Node ID already returned by search.
2. Read the returned source files and lines.
3. Use a narrow continuation command only when the overview is insufficient.

If a command reports `graph_cache_not_found`, run `codegraphy index` once and retry. Search reports whether live source differs from its cached Symbol facts in `data.sources.symbols.cacheState`; do not run `status` before every query. Use `codegraphy filter` only when persisted path exclusions need inspection or change.

Use `-C <workspace>` from outside the workspace. Quote patterns containing spaces or `*`.

## Choose the command by question

- `search <pattern>`: locate matching live source lines, cached AST Symbols, and indexed File or concept Nodes. Matching is case-insensitive; `*` spans characters within one line or name. Symbol results include their `filePath`; text results include `line`, `column`, and `excerpt`.
- `query <node>`: inspect one exact File or Symbol. It returns declared AST Symbols plus bounded incoming and outgoing Relationships in one call.
- `dependencies <node>`: continue through outgoing Relationships—what the Node uses.
- `dependents <node>`: continue through incoming Relationships—what may be affected.
- `path <from> <to>`: verify whether and how two exact Nodes connect.
- `nodes`: inventory shaped Nodes when type-level enumeration is the task.
- `edges`: inventory shaped Relationships when edge-level enumeration is the task.
- `status`: inspect Graph Cache state when freshness itself is the task.
- `doctor`: diagnose settings, cache, runtime, or Plugin failures.
- `filter`, `scope`, and `plugins`: inspect or change durable workspace configuration; do not use them for ordinary navigation.

Query with the narrowest command that answers the current question. Prefer `search` → `query` → source reads over dumping Nodes or Edges.

Once `search` or `query` identifies a relevant File, stop using graph commands to look for details inside that File. Read it or use file-local text search. Do not search again for identifiers already present in returned declarations. Use at most four CodeGraphy calls for an investigation unless you are following `nextOffset`; if four calls have not narrowed the evidence, switch to ordinary source search. Repeated workspace searches are slower and more expensive than reading known source. This navigation budget does not weaken the answer: verify and state every requested condition, default adapter, side-effect destination, and test from source before stopping.

## Keep output bounded

`search` defaults to 20 combined matches. `nodes`, `edges`, `dependencies`, and `dependents` default to 100 results. When `data.page.nextOffset` is not `null`, continue with `--offset <nextOffset>` only if the current page did not answer the question.

Graph navigation commands accept repeatable `--filter`, `--node-type`, and `--edge-type` projections without changing settings. Use persisted `filter` or `scope` mutations only for durable workspace changes.

## Failures and recovery

Data commands write one `{ok:true,command,data}` JSON envelope to stdout. Failures write `{ok:false,command,error}` to stderr and exit nonzero: 1 for an operational failure and 2 for an invalid invocation. `--verbose` adds diagnostics on stderr.

- `graph_cache_not_found`: run `codegraphy index`, then retry.
- `query_target_not_found`: use `search` to obtain an exact File path or Symbol Node ID.
- Empty search: use a shorter literal or one `*` wildcard; after one broader attempt, fall back to ordinary source search.
- Unhealthy cache/settings: run `codegraphy doctor` and follow `error.details.checks`.

Run `codegraphy --help` or `codegraphy <command> --help` for the complete interface and examples.
