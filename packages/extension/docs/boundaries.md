# Boundaries

`@codegraphy-dev/extension` is split by runtime boundary, not by feature area.

## Boundaries

- `src/extension/` owns the VS Code host, workspace state, command wiring, file-system actions, and adapters over `@codegraphy-dev/core`.
- `src/core/` owns extension-local graph view and plugin UI infrastructure. Shared Indexing, Graph Cache, Graph Query, discovery, and analysis behavior lives in `@codegraphy-dev/core`.
- `src/webview/` owns the React UI, store, graph controls and interaction state, renderer integration, and browser-side message handling.
- `src/shared/protocol/` owns extension-to-webview and webview-to-extension message unions.
- `src/shared/graph/`, `src/shared/files/`, `src/shared/settings/`, `src/shared/plugins/`, and `src/shared/view/` own shared payload types.
- `src/shared/mock/` owns fixture-only graph data helpers and is excluded from runtime boundary checks.
- `src/e2e/` owns the VS Code end-to-end harness.

## Current shape

The extension host is still the VS Code composition root. It wires the graph provider, `@codegraphy-dev/core` adapters, extension-local plugin UI registry, and webview bridge together.

The extension source tree is intentionally feature-first inside each runtime boundary:

- `src/extension/agentBridge/` owns VS Code URI request handling for local agent tooling.
- `src/extension/graphView/` and `src/extension/graphViewProvider.ts` own VS Code host orchestration for the Graph View.
- `src/extension/pipeline/` owns extension-facing adapters over `@codegraphy-dev/core` pipeline APIs and extension-only orchestration.
- `src/extension/repoSettings/` owns repo-local settings, freshness decisions, and Graph Cache trust state.
- `src/extension/workspaceFiles/` owns workspace file watching and refresh scheduling.
- `@codegraphy-dev/core` owns File Discovery, Tree-sitter Analysis, headless plugin analysis, cache reads/writes, Graph Projection inputs, and agent-readable Graph Query.
- `@codegraphy-dev/graph-renderer` owns WebGPU drawing and deterministic WebAssembly physics/layout. The extension owns how users configure and interact with it, including settings, persistence, plugins, selection, hover, picking, and context menus.
- `src/shared/visibleGraph/` owns the host/webview shared projection that turns scoped, filtered, and searched graph data into the Visible Graph.

The webview is now organized by concern:

- `app/` for page-level composition
- `components/graph/` for graph rendering, context menus, and runtime helpers
- `components/settingsPanel/` for settings UI
- `pluginRuntime/` and `store/` for browser-side state and plugin integration

The webview source follows the same local-ownership rule:

- Graph controls own filtering and toolbar state near `webview/graphControls/` and `webview/components/toolbar/`.
- Repeated graph interaction behaviors live under the graph feature folders instead of generic helper folders.
- Context menus, export panels, legends, and settings panels each own their local models, views, and tests.

## Rules of thumb

- Keep host-only logic in `src/extension/`.
- Keep UI-only logic in `src/webview/`.
- Keep graph drawing and physics mechanics in `@codegraphy-dev/graph-renderer`; keep CodeGraphy product behavior and renderer orchestration in the extension.
- Keep protocol/message unions in `src/shared/protocol/`.
- Keep payload types in the concrete shared module that owns them.
- Import the concrete module that owns a concern.
- When a helper crosses the runtime boundary, document the direction explicitly in the message docs.
- Keep compatibility barrels narrow. If a public import path needs to stay stable, move behavior behind it into feature-local modules with file-mapped tests.
