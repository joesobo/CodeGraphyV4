# Core Plugin API lifecycle

Installation, activation, and runtime loading are separate.

1. Register a package in `~/.codegraphy/plugins.json`.
2. Global and workspace activation values select active descriptors.
3. Each runtime host imports only its active descriptors.

An active Core descriptor stays dormant until Core opens it.

Core plugins use `@codegraphy-dev/plugin-api`. Core can call these hooks:

- `initialize`
- `onWorkspaceReady`
- `onPreAnalyze`
- `analyzeFile`
- `onFilesChanged`
- `onPostAnalyze`
- `onGraphRebuild`
- `onUnload`

These hooks receive headless workspace and semantic graph data. They do not
receive rendering, webview, or editor state.

See the [Extension Plugin API lifecycle](../extension-plugin-api/LIFECYCLE.md)
for VS Code Extension, Graph View, and panel cleanup behavior.
