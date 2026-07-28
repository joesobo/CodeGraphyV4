# Foreground watchers maintain the Graph Cache

**Status:** Accepted

## Context

Cached Symbols and Relationships become stale while an agent or editor changes source. Explicit `codegraphy index` repairs them, but long coding sessions and multi-agent handoffs can query a cache after many edits. The VS Code Extension already observed workspace events, yet it deferred analysis while the Graph View was closed and therefore did not keep the persisted Graph Cache current.

ADR 0013 initially rejected watcher-assisted impact because a resident process appeared to conflict with ADR 0003's one-shot CLI and no-server boundary. That premise was too broad. A foreground process which only updates the same SQLite cache is not a query server: queries remain independent, one-shot, read-only CLI processes with no transport or session protocol.

Comparable implementations established the failure cases the design must handle. VS Code and Parcel coalesce recursive create, update, and delete events; renames can arrive as delete plus create; directory deletes can omit child events; and Parcel supports filesystem snapshots. Graphify's watcher uses a quiet-period debounce and process lock, but loads ignore rules only at startup and has historical fixes for stale changed, deleted, excluded, and duplicated facts. Watchman favors resumable change cursors and recrawl recovery over heartbeats.

## Decision

Core owns a serialized workspace Graph Cache updater. It:

- starts from a full synchronized workspace engine;
- batches file paths with a 500 ms trailing debounce and two-second maximum batch age;
- retains events which arrive during active analysis for a follow-up batch;
- applies incremental updates when paths are known and reconciles through full discovery for deletions, directories, capped discovery, settings, `.gitignore`, or unmatched paths;
- skips newly created regular files which are outside discovery eligibility and batches which match active workspace Filters;
- emits `ready`, `updating`, `updated`, and recoverable `error` events;
- drains pending work during idempotent disposal.

The CLI exposes that updater as foreground `codegraphy watch [-C workspace]`. It subscribes before initial synchronization, uses Parcel's native recursive watcher, ignores cache artifacts at every `.codegraphy` path segment except the root settings file, emits bounded JSON Lines envelopes, and drains pending changes on `SIGINT` or `SIGTERM`. Query commands remain separate one-shot processes.

The Extension feeds save, create, change, delete, rename, settings, and Git-ignore events into its long-lived, plugin-aware Workspace Pipeline while the Graph View is closed **after a Graph Cache exists**. Its existing scheduler coalesces events, and a serialized persistence adapter awaits the same Pipeline refresh methods used while the view is open. This preserves Extension-host plugin registrations and complete-cache persistence rather than constructing a second default Core plugin host. It does not implicitly index a workspace before the user's first Index operation; events received before a cache exists remain pending for the first visible refresh. When the view opens, the Extension waits for queued closed-view persistence before its visible refresh resumes ownership. Extension teardown also drains pending persistence.

An earlier adapter instantiated the CLI's default Core workspace engine inside the Extension. CI exposed the invalid assumption: closed updates added hidden Core `reexport` capabilities while losing Extension-host relationships and plugin-owned nodes. The adapter was replaced rather than adding translation or compatibility logic. Core still owns the CLI updater, shared indexing and persistence primitives, and cross-process write coordination; the Extension retains its required plugin-host boundary.

Graph Cache writes use operation-scoped cross-process coordination beside `graph.sqlite`. An atomic lock directory records the writer PID and a unique token, is removed after each write, and can recover when its owner process has terminated. SQLite connections also wait up to five seconds for short-lived contention. Incremental analyses verify source content immediately before commit and retry if another writer's newer edit superseded them. This supports simultaneous CLI watchers and Extension writers without an exclusive long-lived watcher owner or heartbeat.

## Evidence

Fake-time Core tests cover trailing debounce, the maximum batch age, edits during indexing, serialized writes, recoverable failures, and shutdown draining. Equivalence tests compare persisted nodes and edges after changed, created, deleted, and renamed referenced files with a fresh full index. Additional regressions cover stale concurrent commits, lifecycle-file rediscovery, eligible and ineligible creations, active Filters, nested cache artifacts, macOS root spelling, startup failure, and closed-view Extension persistence.

A real-filesystem probe exercised rapid writes, create, rename, delete, settings, thirty concurrent one-shot readers, and two simultaneous watcher processes. The final run had no reader or watcher errors and a fresh healthy cache. Observed update latency, including the 500 ms debounce, was 0.53–0.61 seconds. Five rapid writes produced one update. Separate simultaneous cold starts and a later shared edit also completed from both watcher processes with a healthy final cache.

On the 2,535-file relationship fixture, initial watcher synchronization averaged 5.1 seconds and was measured outside agent task time. A ready idle watcher retained about 271 MiB RSS and sampled at 0% CPU after five idle seconds. The resident memory cost makes watching most appropriate for an editor session or longer-running agent workflow, not a short one-off query.

The final three-pair direct agent screen compared the existing CLI plus shipped skill with and without an active watcher on the same asynchronous Plugin-failure task:

| Mean | CLI + skill | CLI + skill + watch | Delta |
|---|---:|---:|---:|
| Correctness | 2/3 | 2/3 | equal |
| All-run model tokens | 218,367 | 220,448 | 1.0% more |
| Correct-run model tokens | 256,984 | 237,257 | 7.7% fewer |
| Tool calls | 24.7 | 22.7 | 8.1% fewer |
| Tool output | 82,992 B | 97,771 B | 17.8% more |
| Elapsed task time | 105.7 s | 83.8 s | 20.7% faster |
| CodeGraphy calls | 3.0 | 2.0 | 1.0 fewer |

This does not establish a retrieval benefit: those agents navigated the graph before editing and did not query newly updated facts. It establishes non-regression against the same CLI arm at the three-run screening resolution. A staged multi-agent handoff screen forced post-edit graph availability, but all three low-thinking agents failed the hidden structural task, so the screen was stopped and no token attribution was made. Watch is therefore accepted for cache correctness and optional long-session freshness, not as a proven universal agent-token optimization. It is unnecessary when graph navigation finishes before edits or explicit Indexing already occurs before the next query.

## Consequences

- ADR 0013's watcher rejection is superseded. ADR 0003 still excludes MCP and persistent query servers; a user-invoked foreground cache updater is allowed.
- The Extension keeps an existing complete persisted graph current through its plugin-aware Pipeline while the Graph View is closed without changing the explicit first-Index lifecycle.
- Multiple local updaters are supported without heartbeat traffic or permanent ownership files.
- Event delivery is a hint, not correctness proof. Full rediscovery remains the recovery path for lifecycle changes and incomplete path evidence; Parcel snapshots remain a future recovery option if event-loss evidence requires them.
- Watcher startup and resident memory are explicit costs. Short tasks can use one-shot `index`, and agents retain full discretion because the skill describes semantics rather than prescribing when to watch.
- Agent-task benchmarking must use a task whose graph navigation actually occurs after relevant edits before claiming watcher-specific token or elapsed-time benefit.

## References

- ADR 0003, CLI and Agent Skill replace MCP
- ADR 0011, agents choose their CodeGraphy strategy
- ADR 0012, structural work and adoption requirements
- ADR 0013, Task Map and the superseded watcher disposition
- VS Code recursive watcher and refresh scheduling behavior
- `@parcel/watcher` subscriptions and filesystem snapshots
- Graphify watcher locking and incremental-update regressions
- Watchman clocks and recrawl recovery
