# VS Code indexing requires explicit user action

**Status:** Accepted

## Context

The VS Code extension registered workspace file and save listeners that started
incremental Indexing. Opening the Graph View could also start background cache
warm-up or a full stale-cache synchronization.

These paths ran repository-wide work on the shared VS Code extension host
without an explicit user request. CPU profiles captured during unresponsive
periods showed CodeGraphy invalidation, Graph Projection, and garbage collection
dominating the extension host.

## Decision

The VS Code extension starts Indexing only after the user selects Index
Workspace or Re-index Workspace.

- Extension activation does not warm the Graph Cache.
- Workspace save, create, change, delete, and rename events do not start
  Indexing or invalidate the cached graph.
- Opening the Graph View can read the last Graph Cache so it can render the
  indexed graph.
- A cached graph load does not warm analysis or synchronize stale inputs in the
  background.
- A missing Graph Cache stays empty until the user selects Index Workspace.
- A stale Graph Cache remains visible until the user selects Re-index
  Workspace.

Settings and graph display actions can re-project already indexed facts. They
must not analyze changed workspace source files.

This decision supersedes the VS Code Live Update and Graph Cache Sync behavior
described in `CONTEXT.md`. It also supersedes ADR 0002 where that decision
allowed the extension to respond to editor lifecycle events through Indexing.

## Consequences

- The cached Relationship Graph can differ from the current workspace until the
  next explicit Indexing action.
- Index freshness can tell the user that the cache is stale, but freshness
  detection does not authorize background Indexing.
- The extension avoids repository analysis work while it is idle.
- Core incremental Indexing APIs remain available for explicit workflows and
  other interfaces.
