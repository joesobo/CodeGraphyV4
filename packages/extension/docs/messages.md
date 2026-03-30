# Message Flow

The extension and webview communicate through typed messages defined in the shared modules under `src/shared/`.

## Extension to webview

The extension sends graph data, settings snapshots, view changes, plugin updates, file info, and export requests.

Typical path:

1. The extension updates state in `src/extension/`.
2. Provider methods serialize the current state into a message from `ExtensionToWebviewMessage`.
3. The webview store and runtime handlers consume the message and update React state or trigger canvas behavior.

## Webview to extension

The webview sends user interaction and UI state messages back to the host.

Typical path:

1. A React component or runtime handler emits a `WebviewToExtensionMessage`.
2. `src/webview/vscodeApi.ts` posts it to the host bridge.
3. The host message listener dispatches to the relevant extension-side action or provider method.

## Plugin messages

Plugin-facing messaging is layered on top of the core bridge.

- The extension tracks readiness and plugin lifecycle state.
- Webview plugin APIs send plugin-scoped actions through the provider bridge.
- The shared message modules are the canonical source for message payload shapes.

## Practical rule

If a message changes the UI, define it in the shared message modules and add a test on both sides of the boundary.
