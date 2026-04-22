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
- `analyzeFile(...)` is the required analysis path for plugins that contribute code analysis
- `onFilesChanged(...)` is the incremental save hook for plugins that maintain cross-file indexes
- graph queries backed by the projected repo-local index and current graph state
- commands, exporters, toolbar actions, and the compatibility `registerView(...)` hook for optional future graph transforms
- context menu items, commands, and exporters
- host-saved exports via `api.saveExport(...)`
- Tier 2 webview slots such as `toolbar`, `node-details`, `tooltip`, `timeline-panel`, `graph-overlay`

Core now owns the default explorer-style file and folder theming through Material Icon Theme. The built-in TypeScript, Python, C#, and Markdown plugins are intentionally minimal now: they mostly contribute ecosystem defaults, filters, and optional semantic enrichment instead of baseline file coloring.

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
- add exporters, commands, toolbar actions, and other UI surfaces through the host API
- register optional view transforms for compatibility, even though the current built-in UI stays on one unified graph surface

Built-in plugins follow the same rules as external plugins and appear in the **Plugins** popup. Plugin processing order is bottom-to-top, so plugins nearer the top win merge conflicts.

For node styling, the host resolves layers in this order:

1. core defaults
2. plugin defaults
3. custom user rules

In practice, "win merge conflicts" means:

- `nodes`, `symbols`, `nodeTypes`, and `edgeTypes` override by matching `id`
- imports/reexports/loads/inherits override when they describe the same source relation
- distinct call/reference targets stay separate so symbol-aware routing is preserved

Markdown-style wikilink scanning is implemented as a wildcard plugin so it can inspect any file, not just `.md` files.
