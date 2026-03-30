# Boundaries

`@codegraphy/extension` is split by runtime boundary, not by feature area.

## Boundaries

- `src/extension/` owns the VS Code host, workspace state, command wiring, and file-system actions.
- `src/core/` owns reusable domain logic for colors, views, discovery, and plugin infrastructure.
- `src/webview/` owns the React UI, store, rendering runtime, and browser-side message handling.
- `src/shared/` owns the protocol and shared types used on both sides of the bridge.
- `src/e2e/` owns the VS Code end-to-end harness.

## Current shape

The extension host is still the main composition root. It wires the graph provider, workspace analyzer, plugin registry, and webview bridge together.

The webview is now organized by concern:

- `app/` for page-level composition
- `components/graph/` for graph rendering, context menus, and runtime helpers
- `components/settingsPanel/` for settings UI
- `pluginRuntime/` and `store/` for browser-side state and plugin integration

## Rules of thumb

- Keep host-only logic in `src/extension/`.
- Keep UI-only logic in `src/webview/`.
- Keep protocol shapes in `src/shared/`.
- Import the concrete module that owns a concern.
- When a helper crosses the runtime boundary, document the direction explicitly in the message docs.
