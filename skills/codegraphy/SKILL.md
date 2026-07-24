---
name: codegraphy
description: Use the CodeGraphy CLI to index, shape, and query a workspace Relationship Graph before reading source.
---

# CodeGraphy

Use CodeGraphy to narrow codebase exploration. The graph guides which source files to read; it does not replace source inspection.

## Fast workflow

1. Run `codegraphy status`. Run `codegraphy index` when the cache is missing/stale **or when the task may follow source changes that status cannot detect**. Indexing is explicit and successful non-verbose output is one JSON line.
2. Choose the narrowest query:
   - `search <text>` resolves a concept or partial path to Nodes.
   - `dependencies <node>` finds outgoing Relationships: what it uses.
   - `dependents <node>` finds incoming Relationships: what may be affected.
   - `path <from> <to>` explains whether and how two Nodes connect.
   - `nodes` and `edges` inventory the shaped graph.
3. Read the returned source files and verify behavior there.

Use `-C <workspace>` from outside the workspace. File selectors are workspace-relative paths or exact Node IDs. Quote multiword search text and globs.

## Keep work bounded

`nodes`, `search`, `edges`, `dependencies`, and `dependents` default to 100 results. Their `data.page.nextOffset` is `null` when complete; otherwise rerun with `--offset <nextOffset>` and, when useful, a smaller `--limit`.

Prefer one-off repeatable `--filter`, `--node-type`, and `--edge-type` options for a task. They do not change settings. Use `codegraphy scope` to discover available type IDs. Use `codegraphy filter` and `codegraphy scope ...` only for durable workspace changes.

Query with the narrowest command that answers the current question instead of dumping the complete graph.

When several queries are independent and known in advance, send them through one snapshot with `codegraphy batch`:

```sh
printf '%s' '{"queries":[{"id":"uses","argv":["dependencies","src/app.ts"]},{"id":"used-by","argv":["dependents","src/app.ts"]}]}' | codegraphy batch
```

Batching reduces latency and Graph Cache reads, but its JSON wrapper may use more tokens. Keep sequential calls when one result determines the next query.

## Failures and recovery

Data commands write a single `{ok:true,command,data}` JSON envelope to stdout. Failures write `{ok:false,command,error}` to stderr and exit nonzero: 1 for an operational failure, 2 for invalid invocation. Use `--verbose` only when diagnostics/progress are useful; it writes additional lines to stderr.

- `graph_cache_not_found`: run `codegraphy index`.
- Missing/stale/unhealthy uncertainty: run `codegraphy doctor` and follow `error.details.checks` actions.
- Empty result: use `search` or `nodes` to confirm the selector, then retry with the exact path/Node ID.

Run `codegraphy --help` or `codegraphy <command> --help` for exact options and examples.
