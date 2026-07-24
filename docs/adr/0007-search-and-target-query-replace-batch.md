# Search and Target Query replace Batch

**Status:** Accepted

## Context

ADR 0006 accepted `batch` from a process-only benchmark: two predetermined Graph Query commands shared one Graph Cache snapshot and reduced median process latency from 293.5 ms to 150.9 ms. That measurement did not test an agent completing an adaptive coding task.

A controlled follow-up ran 18 fresh agents across an easy source-location task and a harder settings-diagnosis task. Each of three navigation conditions ran three times against identical prepared snapshots. All answers scored 10/10. Median adaptive CodeGraphy results were worse than ordinary navigation: 49.3 seconds, 12 calls, and 48,319 tokens versus 28.2 seconds, 8 calls, and 20,433 tokens on the easy task; 188.4 seconds, 44 calls, and 429,216 tokens versus 127.3 seconds, 37 calls, and 208,120 tokens on the hard task.

Batch reduced CodeGraphy round trips but still did not beat ordinary-navigation elapsed time. Trace review showed the larger problem: `search` only narrowed graph Node metadata, exact source phrases returned nothing, the apparent `query` help group was not an executable command, and agents manually composed many low-level traversals before reading source.

The Graph Cache already stores AST Symbol facts with File ownership. Current source text remains authoritative and need not be duplicated in SQLite merely to support discovery.

## Decision

Remove the public `batch` CLI command and exported Core Batch request. Keep one adaptive forward path.

Make `search <pattern>` a workspace discovery operation. It merges, ranks, and globally paginates:

- live source-line matches from eligible indexed File Nodes;
- cached AST Symbol matches with their File provenance; and
- indexed non-Symbol Node matches.

Literal matching is case-insensitive. `*` is a line-local or name-local wildcard. Symbol matches include cached declaration metadata and `filePath`; text matches include one-based line and column plus a bounded excerpt. Search reads source text live and compares it with indexed content hashes so its result states whether cached Symbol facts are fresh or stale. Persisted and one-off path Filters apply. Graph Scope does not hide discovery facts.

Make `query <node>` executable. It resolves one exact workspace-relative File path or Symbol Node ID and returns a fixed-bounded overview from one prepared Graph Cache snapshot: the target, declared AST Symbols, outgoing Relationships, and incoming Relationships. It never infers a natural-language answer, performs Indexing, or accepts a pipeline. Agents use `search` to discover an exact selector, `query` for its first semantic overview, and `dependencies`, `dependents`, or `path` only for continuation.

Root help and the CodeGraphy Agent Skill teach that sequence and explain every navigation command. They do not require a preparatory `status` call. A missing-cache result triggers explicit Indexing; source inspection remains the final evidence step.

## Consequences

- Exact source phrases and wildcard patterns can locate production and test evidence without an ordinary text-search fallback.
- AST Symbols are discoverable from cached facts even when Graph Scope hides Symbol Nodes from graph presentation.
- `query` replaces the confusing pseudo-group with one deep target-overview interface.
- Live text and cached graph facts can differ; the result exposes provenance and freshness instead of silently reindexing.
- Source scanning adds bounded filesystem work to `search`. It reads only eligible indexed File Nodes, skips unreadable, binary, and files larger than 1 MiB, and does not affect graph-only commands.
- The accepted success gate is agent task completion—correctness, elapsed time, tool calls, and total model tokens—not isolated process latency.
