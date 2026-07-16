# Message Flow

The extension and webview communicate through explicit shared modules under `src/shared/`.

## Extension to webview

The extension sends graph data, settings snapshots, view changes, plugin updates, file info, and export requests.

Canonical message union:

- `src/shared/protocol/extensionToWebview.ts`

Typical path:

1. The extension updates state in `src/extension/`.
2. Provider methods serialize the current state into a message from `ExtensionToWebviewMessage`.
3. The webview store and runtime handlers consume the message and update React state or trigger canvas behavior.

The graph-view provider now composes its host bridge through explicit typed method-source adapters instead of mutating the class surface with `Object.assign`.

Startup loading is a special case. The webview may show `Loading graph...` only before the first graph payload and bootstrap completion for that page. After the first graph render, later Indexing, Graph Cache Sync, plugin changes, and file updates should keep the current graph rendered and use graph-local progress messages such as `GRAPH_INDEX_PROGRESS`.

## Webview to extension

The webview sends user interaction and UI state messages back to the host.

Canonical message union:

- `src/shared/protocol/webviewToExtension.ts`

Typical path:

1. A React component or runtime handler emits a `WebviewToExtensionMessage`.
2. `src/webview/vscodeApi.ts` posts it to the host bridge.
3. The host message listener dispatches to the relevant extension-side action or provider method.

Host-side listener composition now lives under `src/extension/graphView/webview/providerMessages/`, which keeps read context, primary actions, settings context, and plugin context explicit and separately testable.

## Plugin messages

Plugin-facing messaging is layered on top of the core bridge.

- The extension tracks readiness and plugin lifecycle state.
- Webview plugin APIs send plugin-scoped actions through the provider bridge.
- Plugin enablement and late external registration reprocess plugin-owned files instead of clearing the Graph Cache.
- Shared payload ownership is explicit:
  - `src/shared/graph/types.ts` for graph data
  - `src/shared/files/info.ts` for file info
  - `src/shared/settings/` for settings snapshots and display/runtime modes
  - `src/shared/plugins/` for plugin status, decorations, and context menu payloads
  - `src/shared/view/types.ts` for view payloads

## Practical rule

If a message changes the UI, define it in the shared message modules and add a test on both sides of the boundary.
