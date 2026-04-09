# Plugin Guide

CodeGraphy has two plugin surfaces:

- marketplace plugin extensions that register themselves with the core `codegraphy.codegraphy` extension
- type-safe plugin implementations built against [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Published plugins

- [CodeGraphy core extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- [CodeGraphy Python](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python)
- [CodeGraphy C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp)
- [CodeGraphy GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot)
- [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Start here

- [Plugin lifecycle](./plugin-api/LIFECYCLE.md)
- [Plugin types](./plugin-api/TYPES.md)
- [Plugin events](./plugin-api/EVENTS.md)

The current plugin API supports more than file analysis:

- per-file analysis objects with symbols, relations, node types, and edge types
- `analyzeFile(...)` is the normal analysis path; `detectConnections(...)` remains only as a compatibility fallback
- graph queries backed by the host graph cache
- custom views with `recomputeOn` dependencies
- context menu items, commands, and exporters
- host-saved exports via `api.saveExport(...)`
- Tier 2 webview slots such as `toolbar`, `node-details`, `tooltip`, `timeline-panel`, `graph-overlay`

## Packaging model

Third-party plugins should ship as their own VS Code extensions.

At activation time, the plugin extension should:

1. get the `codegraphy.codegraphy` extension export
2. activate it if needed
3. call `registerPlugin(...)` with its plugin implementation

The plugin implementation itself can live in the same VS Code extension package or in a shared library package.

## Plugin author setup

Install the type package:

```bash
pnpm add -D @codegraphy-vscode/plugin-api
```

Minimal usage:

```ts
import type { CodeGraphyAPI, IPlugin } from '@codegraphy-vscode/plugin-api';
```

Use `import type` because the package is type-only.

## Analysis model

The core extension owns discovery, repo-local settings, caching, graph projection, and export flow. Plugins contribute analysis and UI on top of that pipeline and can:

- return per-file analysis results with relations, symbols, and extra nodes
- override or enrich lower-priority plugin results for the same file
- add node kinds
- add edge kinds
- contribute language or framework-specific semantics
- add views, exporters, commands, toolbar actions, and other UI surfaces through the host API

Built-in plugins follow the same rules as external plugins and appear in the **Plugins** popup. Plugin processing order is bottom-to-top, so plugins nearer the top win merge conflicts.

Markdown-style wikilink scanning is implemented as a wildcard plugin so it can inspect any file, not just `.md` files.
