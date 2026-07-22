# Plugin lifecycle

Installation, activation, and runtime loading are separate.

1. A package is registered in `~/.codegraphy/plugins.json`.
2. Global and workspace activation values select active descriptors.
3. Each runtime host imports only its active descriptors.

An active descriptor stays dormant until its host opens it.

## Core lifecycle

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

## Extension lifecycle

Extension plugins use `@codegraphy-dev/extension-plugin-api`. The VS Code
extension can call:

- `initialize`
- `onWebviewReady`
- `onUnload`

Extension webview scripts can return cleanup work. Cleanup must release timers,
event listeners, animation loops, and injected styles.

## Example

If particles is enabled globally:

- `codegraphy query ...` resolves it as active but does not import it;
- opening the VS Code extension loads it because its host is
  `codegraphy.extension`;
- disabling it in one workspace prevents the Extension host from loading it in
  that workspace.
