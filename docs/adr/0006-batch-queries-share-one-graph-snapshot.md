# Batch queries share one Graph Cache snapshot

**Status:** Accepted

## Context

Coding agents frequently need several independent Graph Query results at once, such as outgoing and incoming Relationships for a known File Node. Running each existing CLI command separately repeats Node process startup, workspace status checks, settings reads, and Graph Cache hydration.

A two-query benchmark on the TypeScript example workspace measured separate `dependencies` and `dependents` processes at 293.5 ms median and 299.9 ms p95. A batch against one prepared graph snapshot measured 150.9 ms median and 155.9 ms p95. Compact output grew from 683 bytes to 741 bytes, so batching improves latency and round trips rather than response size.

## Decision

Add `codegraphy batch` as a transport over the six existing Graph Query commands. It does not add a Graph Query report or change the public Graph Query vocabulary accepted by ADR 0003.

`batch` reads one bounded JSON document from standard input:

```json
{
  "queries": [
    { "id": "uses", "argv": ["dependencies", "src/app.ts"] },
    { "id": "used-by", "argv": ["dependents", "src/app.ts"] }
  ]
}
```

Each `argv` uses the existing parser for `nodes`, `search`, `edges`, `dependencies`, `dependents`, or `path`. Existing defaults, bounds, one-off Graph Scope and Filter projections, and selector safety therefore stay on one forward path.

The complete input is validated before Graph Query execution. Query IDs are unique strings. A batch contains 1 through 100 queries and at most 1 MiB of UTF-8 JSON. The public Core batch request enforces the same query-count bound; the byte bound belongs to the stdin transport. The command resolves one CodeGraphy Workspace, reads one Graph Cache snapshot, then applies each query's projection against that snapshot.

Success results preserve input order and include their caller-provided IDs. Failure is all-or-nothing: the CLI returns a failed outer envelope, discards sibling results, and identifies the failed query ID, command, code, and message in `error.details`.

Batch remains read-only. It never performs Indexing, mutates settings, executes non-query commands, refers to an earlier result, or searches parent directories for a workspace. Agents continue to run explicit Indexing when cached knowledge may be outdated.

## Consequences

- Agents can group independent, already-known Graph Queries to reduce process startup and Graph Cache reads.
- Dependent exploration still uses separate calls: a batch is not a pipeline or query language.
- Single queries keep their existing commands and result shapes.
- Batch input costs some additional bytes and its output can be slightly larger than separate envelopes. Agents should use it for latency and round-trip reduction, not assume token savings.
- Core exposes a batch workspace request that prepares query source data once and projects it independently for every item.
- A future compound `inspect` operation remains a separate semantic decision. Batch does not justify adding hidden traversal or inference behavior.
