# Extension Plugin API lifecycle

Installation, activation, and runtime loading are separate.

1. Register a package in `~/.codegraphy/plugins.json`.
2. Global and workspace activation values select active descriptors.
3. The VS Code Extension imports active `codegraphy.extension` descriptors.

An active descriptor stays dormant until the Extension host opens it. The host
can call these hooks:

- `initialize`
- `onWebviewReady`
- `onUnload`

Extension webview scripts can return cleanup work. Cleanup must release timers,
event listeners, animation loops, and injected styles.

## Panel lifecycle

Registering a panel renders it once in a closed state. `open`, `close`, and
`toggle` preserve that instance. `dispose` runs its render cleanup and removes
the panel. The host also disposes a plugin's panels when it unloads the plugin.

If you enable Particles globally, a Core CLI query reports it as active but
does not import it. Opening the VS Code Extension loads it because its host is
`codegraphy.extension`. A workspace setting can disable it for that workspace.

See the [Core Plugin API lifecycle](../plugin-api/LIFECYCLE.md) for headless
analysis hooks.
