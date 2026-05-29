# Issue 160: Move Indexing Behind A Deeper Core Module

## Trello

- https://trello.com/c/2JjIwzcM/160-architecture-move-indexing-behind-a-deeper-core-package-module

## Draft PR

- https://github.com/joesobo/CodeGraphyV4/pull/223

## Current Task Frame

Move Indexing behind a deeper `@codegraphy-dev/core` module so the VS Code extension adapter owns VS Code progress, warnings, and Graph View messages only.

Core should own:

- Indexing orchestration
- Graph Cache persistence
- plugin lifecycle during indexing
- graph generation semantics
- runtime state needed to rebuild or refresh indexed graph data

The VS Code extension should own:

- VS Code workspace integration
- progress and warning presentation
- Graph View message flow
- editor-specific refresh triggers

## Existing Tension To Resolve

`docs/plans/2026-04-07-code-index-rearchitecture.md` said indexing work should stay inside `packages/extension`, while `docs/plans/2026-05-13-extract-core-from-extension-package.md` later settled that `@codegraphy-dev/core` owns the full Indexing pipeline.

This task follows the later Core Package decision, but the implementation boundary still needs to be pinned down before code changes.

## Alignment Decisions

### 1. Later Plans Supersede Earlier Plans

When repo plans conflict, the later dated plan is authoritative unless a newer decision says otherwise.

For this task, `docs/plans/2026-05-13-extract-core-from-extension-package.md` supersedes the older April indexing placement decision. Indexing belongs in the Core Package because Core is CodeGraphy's main engine.

The VS Code extension should render and integrate with VS Code. It should not own Indexing behavior.

### 2. Core Owns Indexing Runtime State

Long-lived indexing state is engine state and belongs in the Core Package.

Core should own the state currently represented by extension facade fields such as `_lastDiscoveredFiles`, `_lastDiscoveredDirectories`, `_lastFileAnalysis`, `_lastFileConnections`, and `_lastWorkspaceRoot`, plus the cache invalidation and graph rebuild state derived from them.

The VS Code extension may keep UI and editor session state such as active webview panels, pending progress notifications, active editor context, and Graph View message subscriptions.

### 3. Core Owns Plugin Processing And Plugin Status Semantics

The Core Package owns plugin processing during Indexing and the status semantics derived from plugin runtime state, workspace settings, installed plugin records, discovered files, and indexed connection data.

The VS Code extension may expose UI for toggling and configuring plugins, then ask Core for the updated plugin status and graph data. The extension should render the plugin information and graph payload Core returns, not assemble plugin status from engine internals.

### 4. Plugin Toggle UI Calls Core Commands

When the VS Code extension plugin UI enables, disables, orders, or configures a plugin, the extension should send that intent to a Core-owned workspace plugin operation.

Core should update Workspace Settings, report or mark Graph Cache freshness effects, and decide what indexing or graph rebuild work is needed. The extension should not directly edit the `plugins` setting or decide whether plugin files require incremental reprocessing versus full analysis.

### 5. Core Rebuilds Relationship Graph Data

Rebuilding graph data from the current indexed state is a Core Package operation.

Core should own rebuilding the Relationship Graph payload from indexing state, Graph Scope, workspace/plugin settings, and graph-data filters.

The VS Code extension should own view-layer work after Core returns graph data, such as applying current webview transforms, sending Graph View messages, updating progress UI, and rendering.

### 6. Show Orphans Stays In The Graph View Adapter

**Show Orphans** is a Graph View presentation setting, not part of Core Indexing or the Core Graph Query request shape for this task.

Core can keep lower-level helper functions if they are already useful, but the deeper Core indexing module should not take `showOrphans` as an indexing or rebuild concern. The VS Code extension decides whether to render Orphan Nodes after Core returns graph data.

### 7. Core Owns Live Update Semantics

For **Live Update**, the VS Code extension should detect VS Code file events and report changed paths to Core.

Core should own pending-changed-file state, invalidation, incremental analysis, full-indexing fallback, Graph Cache writes, and fresh/stale status updates.

The Core result should let the Graph View preserve the smoothest possible rendered experience. When Core can produce an incremental graph update, the extension should apply node and edge updates to the D3 graph instead of resetting the whole graph or replacing the Graph View loading state.

### 8. Live Update Uses Core Signals And Fetchable Changes

The VS Code extension should translate VS Code workspace events into Core input, not directly compute graph changes.

Target flow:

1. The user creates, edits, deletes, or renames files in VS Code.
2. The extension reports the changed paths to Core.
3. Core analyzes the changed files, updates its internal Relationship Graph state, updates Graph Cache state, and emits a signal that graph data changed.
4. The extension reacts to the signal and fetches graph changes from Core.
5. The Graph View applies those changes to the already-rendered D3 graph when possible.

The preferred Graph View path is to fetch and apply changes since the extension already has most nodes and edges loaded. A full graph fetch remains a fallback for cases where Core decides the change requires full Indexing or the extension cannot safely apply a patch.

Do not introduce a heavyweight "session" abstraction just to support this flow unless implementation evidence shows it is needed.

The important contract is:

- the extension reports changed files to Core
- Core updates internal graph/cache state
- Core emits a graph-changed signal
- the extension fetches updated graph information from Core
- the extension applies the smallest safe Graph View update it can

Change detection can be implemented by Core producing a patch, by the extension comparing its current nodes and edges with Core's current graph data, or by another simple mechanism discovered during implementation. The architecture should not require picking the final diffing mechanism before the first slice.

### 9. Move Ownership Before Perfecting Graph Patches

The first implementation slice should prioritize moving ownership boundaries into Core without trying to perfect patch-style Graph View updates.

The implementation should preserve current graph smoothness and leave a clear hook for patch-style updates. After Core owns indexing, live-update, plugin, and cache semantics, the Graph View update mechanism can be improved if the existing full-graph reconcile path is not smooth enough.

## Notes

### Graph Query Pagination Terms

`offset` means pagination offset: skip the first N sorted query results before returning a page. It matters for MCP/CLI/list-style Graph Query results, but probably not for full Graph View rendering.

## Implementation Checkpoints

### 2026-05-29

- Added `createCodeGraphyWorkspaceEngine` in `@codegraphy-dev/core` so Core retains discovered files, file analysis, graph data, and workspace root across changed-file indexing calls.
- Added Core support for configured plugin entries so callers can pass plugin options and package metadata into Core-owned indexing registration.
- Moved changed-file refresh selection, invalidation, plugin `notifyFilesChanged` fallback handling, incremental reanalysis, cache persistence, and index metadata persistence into `@codegraphy-dev/core`.
- Replaced the extension changed-file refresh runtime with a compatibility export to the Core implementation.
- Moved plugin status and plugin-name query semantics into `@codegraphy-dev/core`, with extension compatibility shims delegating to Core.
- Moved workspace plugin selection rules into `@codegraphy-dev/core`, so the extension no longer owns the package-plugin settings merge/remove behavior.

Remaining deeper-boundary work:

- Route the extension's long-lived `WorkspacePipeline` state directly through the Core workspace engine instead of adapter facades around extension-owned fields.
- Move plugin enable/disable/configuration command execution fully behind Core-owned workspace plugin operations.
- Decide whether Core should return graph patches or whether the extension should diff Core's current graph against the rendered Graph View state for the first live-update UI improvement.
