# Plugin Guide

CodeGraphy supports two plugin layers:

- Marketplace plugin extensions that register themselves with the core `codegraphy.codegraphy` extension
- Type-safe plugin implementations built against `@codegraphy-vscode/plugin-api`

Use these docs as the starting point:

- [Plugin lifecycle](.-vscode/plugin-api/LIFECYCLE.md)
- [Plugin types](.-vscode/plugin-api/TYPES.md)
- [Plugin events](.-vscode/plugin-api/EVENTS.md)

## Packaging model

Third-party plugins should ship as their own VS Code extensions.

At activation time, the plugin extension should:

1. get the `codegraphy.codegraphy` extension export
2. activate it if needed
3. call `registerPlugin(...)` with its plugin implementation

The plugin implementation itself can live in the same package or in a shared library package.
