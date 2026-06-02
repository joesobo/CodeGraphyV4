# Trello 165 Dev Mode Diagnostics Plan

Trello card: https://trello.com/c/s2S4WRcB/165-extension-add-verbose-dev-mode-diagnostics
Draft PR: https://github.com/joesobo/CodeGraphyV4/pull/236

## Alignment

- Add a single **Verbose Diagnostics** toggle under the Settings panel Performance section.
- Persist the toggle in workspace-local `.codegraphy/settings.json`.
- Default the setting to `false`.
- The toggle takes effect immediately for newly occurring diagnostics.
- Restart or reload VS Code is only needed when support needs startup lifecycle logs.
- The VS Code UI toggle controls diagnostics for the VS Code Extension interface.
- CodeGraphy CLI and CodeGraphy MCP opt into verbose diagnostics per invocation; they do not become verbose merely because the VS Code UI toggle is persisted in workspace settings.
- Diagnostics cover Core Package activity across its three direct interfaces: VS Code Extension, CodeGraphy CLI, and CodeGraphy MCP.
- Diagnostics also cover VS Code Extension lifecycle activity, which exists only in the UI interface.
- Diagnostic output is interface-specific:
  - VS Code Extension: VS Code Developer Tools console.
  - CodeGraphy CLI: terminal diagnostic output that does not corrupt normal JSON stdout.
  - CodeGraphy MCP: MCP-safe diagnostic output, preferably included in tool results or exposed through explicit diagnostic metadata instead of writing arbitrary stdio logs.
- Logs should include event names, lifecycle phases, counts, plugin or package ids, cache decisions, and workspace-relative paths when useful.
- Logs should avoid file contents and avoid absolute paths unless an existing error path already reports one.

## Product Behavior

When **Verbose Diagnostics** is off, CodeGraphy should keep normal console logging quiet except for existing errors and warnings.

As part of this work, selectively move obvious non-error lifecycle logs behind Verbose Diagnostics when they are noisy in normal use. Do not migrate all existing logs indiscriminately.

When **Verbose Diagnostics** is on for a CodeGraphy interface, CodeGraphy should emit copy/paste-friendly diagnostics with a recognizable prefix:

```text
[CodeGraphy] <event message>: <compact facts>
```

Recommended context style is a concise event message followed by only the facts needed to orient debugging, for example:

```text
[CodeGraphy] Graph Cache stale: reason=plugin-signature-changed
```

Core Package diagnostics should be modeled as structured diagnostic events first, then rendered by each adapter. The Core Package should not know about VS Code Developer Tools, terminal streams, or MCP transport details.

Diagnostics are factual only across interfaces. They should report state, phases, decisions, counts, plugin ids/packages, cache reasons, and execution context. They should not include suggested next actions, advice, or prescriptive guidance.

There is one curated verbose mode. Do not add multiple verbosity levels such as `verbose`, `trace`, or `-vvv`.

Each diagnostic event should carry stable `area` and `event` identifiers, for example `graph-cache` + `load`, `indexing` + `discovery-completed`, or `plugin` + `initialize-started`.

Diagnostic `context` should be JSON-serializable plain data only: strings, booleans, numbers, null, arrays, and plain objects. Normalize `Error` objects, `Map`, `Set`, VS Code objects, class instances, and paths before emitting.

Paths in diagnostic context should be workspace-relative whenever a CodeGraphy Workspace root is known. Absolute paths are reserved for explicit workspace roots, external package locations, and existing error surfaces where the absolute path is already part of the failure.

Diagnostics should include timing facts for phase boundaries when cheap and reliable, such as discovery duration, analysis duration, cache load/save duration, Graph Query duration, and plugin hook duration.

Multi-event operations should include a stable `operationId` or `requestId` so interleaved diagnostics can be correlated across indexing, Graph Cache Sync, Graph Query, CLI commands, MCP tool calls, and extension analysis requests.

Operation-start diagnostics may include compact behavior-shaping snapshots, such as enabled plugin ids/packages, disabled plugin ids, Graph Scope counts, and filter counts. Diagnostics should not dump complete settings objects.

Important existing errors and warnings should be wrapped with structured diagnostic context when diagnostics are enabled, while preserving the existing error or warning behavior.

Verbose diagnostics should remain high-signal. Prefer operation boundaries, state transitions, decisions, summaries, timings, and structured error context. Avoid repeated hot-loop logs, per-node/per-edge/per-file chatter, and raw dumps that bury the actual failure signal.

## External Patterns Reviewed

- `debug` uses scoped namespaces and sends debug output to stderr by default, which supports targeted verbosity without corrupting normal stdout.
- npm separates command output from debug logs and treats verbose/timing information as diagnostic support material, not the primary command result.
- curl writes verbose transfer diagnostics to stderr and has separate mechanisms for structured transfer facts.
- Git distinguishes human output from stable porcelain output, which reinforces that CodeGraphy CLI diagnostics must not destabilize parseable stdout.
- OpenTelemetry semantic conventions reinforce stable attribute names and event identity instead of prose-only logs.

## Signal Budget

Verbose diagnostics should answer "what happened, in what order, with what inputs and counts" without trying to narrate every internal step.

Emit diagnostics for:

- operation start/end/failure
- cache status, load, freshness, invalidation, save, and sync decisions
- workspace path resolution
- discovery, analysis, graph projection, Graph Query, and graph publication boundaries
- plugin selection, initialization, lifecycle hooks, skipped plugins, and plugin failures
- settings or scope facts that materially affect an operation
- existing important errors/warnings with added operation and context facts

Avoid diagnostics for:

- every file analyzed unless a bounded sample is explicitly needed for a failure
- every node, edge, relationship, symbol, render tick, pointer event, or progress increment
- complete settings objects, file contents, AST data, Graph Cache row data, or raw graph payloads
- speculative explanations or suggested next actions

## Implementation Plan

1. Settings contract and persistence
   - Add `verboseDiagnostics: boolean` to `ICodeGraphyRepoSettings`.
   - Add default `verboseDiagnostics: false` in `createDefaultCodeGraphyRepoSettings`.
   - Add the key to persisted-shape allowlisting.
   - Add the key to settings snapshots/reset behavior.
   - Add webview-to-extension and extension-to-webview messages for setting updates.
   - Add store state and setters so the webview can render and immediately reflect the persisted value.

2. Performance toggle UI
   - Add a compact row to `PerformanceSection`.
   - Use the existing `Switch` and `Label` pattern.
   - Label the toggle `Verbose Diagnostics`.
   - Post an update message immediately when the switch changes.

3. Diagnostic logger
   - Add a small Core Package diagnostic event contract, for example `{ area, event, context }`.
   - Use stable `area` and `event` values; do not make prose messages the only event identity.
   - Enforce or normalize JSON-serializable context.
   - Normalize workspace paths to workspace-relative paths where possible.
   - Include operation/request ids for multi-event operations.
   - Add adapter-side renderers for Extension, CLI, and MCP.
   - Adapter renderers should accept an enabled predicate so toggling or flags take effect immediately where the interface supports it.
   - Keep diagnostics inert when disabled.
   - Use `[CodeGraphy]` as the fixed prefix for extension console and CLI output.
   - Prefer typed helper functions for consistent area/event/context fields instead of open-ended console calls.

4. Core Package diagnostic hooks
   - Extend Core Package indexing/logging options with an optional diagnostic callback or logger.
   - Keep the Core Package independent of VS Code APIs.
   - Emit diagnostics at Core Package lifecycle boundaries:
     - workspace index start/end
     - changed-file refresh start/end
     - plugin registry creation and plugin initialization summary
     - file discovery start/end and limit reached
     - file analysis start/end with cache hit/miss summary
     - pre/post analysis hooks and files-changed hook summaries
     - Graph Cache status/load/save decisions
     - cheap/reliable duration facts for discovery, analysis, cache, query, and plugin hook phases
     - compact behavior-shaping snapshots at operation start
   - Have each Core Package adapter pass its own gated diagnostic sink into Core Package calls.

5. CodeGraphy CLI diagnostics
   - Add a global CLI activation path for Core Package diagnostics: `--verbose`, accepted consistently by every command.
   - Keep this as a single on/off verbose mode; do not add multiple CLI verbosity levels.
   - Do not read the persisted `verboseDiagnostics` setting as an implicit CLI verbose trigger.
   - Keep ordinary command output stable. For commands that currently write JSON to stdout, diagnostic text should not be written to stdout.
   - Prefer stderr for human-readable diagnostic lines or an explicit structured diagnostic field only when the command already returns structured output and callers can tolerate the schema.
   - Cover command parsing, workspace path resolution, status/cache/plugin-management boundaries, and `codegraphy index` lifecycle decisions.
   - Keep CLI verbose diagnostics factual only.

6. CodeGraphy MCP diagnostics
   - Add an MCP activation path for Core Package diagnostics that does not rely on process stderr being visible to clients.
   - Add `verboseDiagnostics?: boolean` consistently to every MCP tool.
   - Keep this as a single boolean verbose mode.
   - Do not read the persisted `verboseDiagnostics` setting as an implicit MCP verbose trigger.
   - Keep default tool results unchanged when diagnostics are disabled.
   - Ensure `codegraphy_index` can return diagnostics for Core indexing/cache/plugin decisions when requested.
   - Query tools should expose Graph Cache read and Graph Query diagnostics when requested, even if their trace is shorter than indexing diagnostics.
   - Optimize MCP diagnostics for factual agent context:
     - workspace path actually used
     - Graph Cache state and stale reasons
     - Core Package phases that ran
     - counts for discovered/analyzed/returned items
     - plugin ids/packages considered, loaded, skipped, or errored
     - Graph Scope, Filter, Search, pagination, and query decisions that affected result size
   - Do not include suggested next actions or prescriptive guidance in MCP diagnostics.

7. VS Code Extension diagnostics
   - Emit diagnostics for extension activation and provider construction.
   - Emit diagnostics for Graph View resolve, webview ready, first workspace ready, and message routing for lifecycle-level messages.
   - Emit diagnostics for analysis requests:
     - requested mode: load/analyze/index/refresh/incremental
     - stale/aborted request decisions
     - background Graph Cache Sync start/end/failure
     - Graph Cache freshness/missing/stale decisions
     - compact settings, Graph Scope, plugin, and filter counts that affect the request
     - graph publication counts before sending `GRAPH_DATA_UPDATED`
   - Emit diagnostics for plugin toggles, reload/sync, contribution refreshes, and plugin status summaries.
   - Pass the same enabled diagnostic sink into Core Package calls made by the extension.

8. Webview diagnostics
   - Keep the primary target as VS Code Developer Tools.
   - Log webview-side lifecycle and signal events that are visible only in the webview runtime:
     - received bootstrap/settings/graph-data messages
     - graph runtime state transitions
     - graph render readiness and graph mode changes
   - Gate webview logs from the same persisted setting delivered in the normal settings/bootstrap flow.

9. User-facing troubleshooting docs
   - Add or update troubleshooting copy describing the support workflow:
     - open Settings > Performance
     - enable Verbose Diagnostics
     - reload VS Code if startup logs are needed
     - open Developer Tools
     - reproduce the issue
     - copy relevant `[CodeGraphy]` logs into the bug report
   - Add CLI troubleshooting copy for `codegraphy ... --verbose` or the final chosen CLI flag.
   - Add MCP troubleshooting copy showing how an agent should request verbose diagnostics and where to find returned diagnostic entries.
   - Use the name **Verbose Diagnostics** consistently in docs.

10. Tests
   - Settings persistence:
     - default value is false
     - update message persists `verboseDiagnostics` to `.codegraphy/settings.json`
     - manual settings reload or reset broadcasts the value back to the webview
   - UI:
     - Performance toggle renders from store state
     - toggling posts the correct update message
   - Logger:
     - disabled logger emits nothing
     - enabled logger emits the fixed prefix and context
     - enabled logger keeps context JSON-serializable
     - important errors/warnings are wrapped with structured context without suppressing existing behavior
     - hot-loop/per-item diagnostics are aggregated or omitted
   - Core Package:
     - diagnostic callbacks fire for index/discovery/plugin/cache boundaries without importing VS Code
   - CLI:
     - verbose mode emits diagnostics to the intended non-stdout sink
     - JSON stdout remains parseable when verbose diagnostics are enabled
     - default mode remains quiet
   - MCP:
     - default tool responses remain unchanged
     - verbose diagnostic requests include Core Package diagnostics in the intended response shape
     - MCP stdio transport is not polluted by ad hoc console output
   - Extension lifecycle:
     - representative analysis/cache/plugin lifecycle diagnostics are gated by the setting
   - Webview:
     - representative message/runtime diagnostics are gated by the setting

11. Validation
   - Run targeted tests while iterating.
   - Run relevant extension and Core Package test filters.
   - Run lint and typecheck before finishing.
   - Add a detailed changeset for the user-facing behavior change.
   - The changeset should describe what was added and how to use Verbose Diagnostics through the UI, CLI `--verbose`, and MCP `verboseDiagnostics`.

## Files Likely To Change

- `CONTEXT.md`
- `docs/agents/trello-165-dev-mode-diagnostics-plan.md`
- `packages/core/src/indexing/*`
- `packages/core/src/cli/*`
- `packages/core/src/analysis/*`
- `packages/core/src/plugins/*`
- `packages/core/src/graphCache/*`
- `packages/mcp/src/mcp/*`
- `packages/extension/src/extension/repoSettings/*`
- `packages/extension/src/extension/graphView/*`
- `packages/extension/src/extension/pipeline/*`
- `packages/extension/src/shared/protocol/*`
- `packages/extension/src/shared/settings/*`
- `packages/extension/src/webview/store/*`
- `packages/extension/src/webview/components/settingsPanel/performance/*`
- `packages/extension/src/webview/*`
- `packages/extension/tests/**`
- `packages/core/tests/**`
- troubleshooting docs or README
- `.changeset/*`
