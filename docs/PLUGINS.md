# Plugin Guide

CodeGraphy has two plugin surfaces:

- marketplace plugin extensions that register themselves with the core `codegraphy.codegraphy` extension
- type-safe plugin implementations built against [`@codegraphy/plugin-api`](https://www.npmjs.com/package/@codegraphy/plugin-api)

## Published plugins

- [CodeGraphy core extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- [CodeGraphy Python](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python)
- [CodeGraphy C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp)
- [CodeGraphy GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot)
- [`@codegraphy/plugin-api`](https://www.npmjs.com/package/@codegraphy/plugin-api)

## Start here

- [Plugin lifecycle](./plugin-api/LIFECYCLE.md)
- [Plugin types](./plugin-api/TYPES.md)
- [Plugin events](./plugin-api/EVENTS.md)

The current plugin API supports more than file analysis:

- per-file analysis objects with symbols, relationships, Node Types, and Edge Types
- `analyzeFile(...)` is the required analysis path for plugins that contribute code analysis
- `onFilesChanged(...)` is the incremental save hook for plugins that maintain cross-file indexes
- analysis hooks receive an optional `context` object; use `context.fileSystem` for timeline-safe repo reads
- graph queries backed by the projected workspace-local index and current graph state
- commands, exporters, toolbar actions, and the compatibility `registerView(...)` hook for optional future graph transforms
- context menu items, commands, and exporters
- host-saved exports via `api.saveExport(...)`
- Tier 2 webview slots such as `toolbar`, `node-details`, `tooltip`, `timeline-panel`, `graph-overlay`

Core now owns the default explorer-style file and folder theming through Material Icon Theme. The built-in TypeScript, Python, C#, and Markdown plugins are intentionally minimal now: they mostly contribute ecosystem defaults, filters, and optional semantic enrichment instead of baseline file coloring.

For timeline compatibility, third-party plugins should avoid reading the live workspace directly during analysis. Use the plugin hook `context` instead so the same plugin can resolve files from either the current workspace or a historical commit snapshot.

## Packaging model

During the core extraction, language plugins are moving toward headless npm packages that are consumed by `@codegraphy/core`.

Installation and enablement are separate:

- `npm i -g @codegraphy/plugin-python` installs a plugin package for the developer's toolchain.
- `codegraphy plugins refresh` records installed `@codegraphy/*` plugin packages in `~/.codegraphy/plugins.json`.
- `codegraphy plugins add <package>` records an explicitly named globally installed plugin package, including private or non-`@codegraphy` packages.
- `codegraphy plugins enable <package> [workspace]` writes that plugin into the workspace-local `plugins` array.
- `codegraphy plugins disable <package> [workspace]` removes that plugin from the workspace-local enabled set.
- Enabling and disabling plugins do not run Indexing automatically; run `codegraphy index [workspace]` to refresh the Graph Cache.

Plugin packages declare CodeGraphy metadata in `package.json` so discovery can validate compatibility without importing arbitrary runtime code:

```json
{
  "name": "@codegraphy/plugin-python",
  "version": "1.2.3",
  "exports": {
    ".": "./dist/index.js"
  },
  "codegraphy": {
    "type": "plugin",
    "apiVersion": "^2.0.0",
    "defaultOptions": {
      "includeTests": true
    },
    "disclosures": []
  }
}
```

The npm package's normal `exports` field owns runtime import behavior. The `codegraphy` block is for identity, Plugin API compatibility, optional default options, and optional capability disclosures. Plugin runtime loading happens during explicit Indexing, not during install, refresh, list, enable, or disable commands.

## Plugin author setup

Install the type package:

```bash
pnpm add -D @codegraphy/plugin-api
```

Minimal usage:

```ts
import type { CodeGraphyAPI, IPlugin } from '@codegraphy/plugin-api';
```

Use `import type` because the package is type-only.

## Analysis model

`@codegraphy/core` owns discovery, workspace-local Settings, caching, Graph Projection, and plugin analysis. Plugins contribute analysis on top of that pipeline and can:

- return per-file analysis results with relationships, symbols, and extra nodes
- override or enrich lower-priority plugin results for the same file
- add Node Types
- add Edge Types
- contribute language or framework-specific semantics
- add exporters, commands, toolbar actions, and other UI surfaces through the host API
- register optional view transforms for compatibility, even though the current built-in UI stays centered on the Graph View and Visible Graph

Built-in plugins follow the same rules as external plugins and appear in the **Plugins** popup. Plugin processing order is bottom-to-top, so plugins nearer the top win merge conflicts.

For node styling, the host resolves layers in this order:

1. core defaults
2. plugin defaults
3. custom user Legend Entries

In practice, "win merge conflicts" means:

- `nodes`, `symbols`, `nodeTypes`, and `edgeTypes` override by matching `id`
- imports/reexports/loads/inherits override when they describe the same source relationship
- distinct call/reference targets stay separate so symbol-aware routing is preserved

Markdown-style wikilink scanning is implemented as a wildcard plugin so it can inspect any file, not just `.md` files.
