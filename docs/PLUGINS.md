# Plugin Guide

CodeGraphy plugins are headless npm packages consumed by `@codegraphy/core`.

The VS Code extension visualizes CodeGraphy data and renders plugin controls, but plugin packages do not activate through VS Code and should not import `vscode`.

## Published plugins

- [CodeGraphy VS Code extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [`@codegraphy/plugin-api`](https://www.npmjs.com/package/@codegraphy/plugin-api)
- [`@codegraphy/plugin-typescript`](https://www.npmjs.com/package/@codegraphy/plugin-typescript)
- [`@codegraphy/plugin-python`](https://www.npmjs.com/package/@codegraphy/plugin-python)
- [`@codegraphy/plugin-csharp`](https://www.npmjs.com/package/@codegraphy/plugin-csharp)
- [`@codegraphy/plugin-godot`](https://www.npmjs.com/package/@codegraphy/plugin-godot)
- [`@codegraphy/plugin-markdown`](https://www.npmjs.com/package/@codegraphy/plugin-markdown)

## Start here

- [Plugin lifecycle](./plugin-api/LIFECYCLE.md)
- [Plugin types](./plugin-api/TYPES.md)
- [Plugin events](./plugin-api/EVENTS.md)

The current plugin API supports more than file analysis:

- per-file analysis objects with symbols, relationships, Node Types, and Edge Types
- `analyzeFile(...)` is the required analysis path for plugins that contribute code analysis
- `onFilesChanged(...)` is the incremental save hook for plugins that maintain cross-file indexes
- analysis hooks receive an optional `context` object; use `context.fileSystem` for timeline-safe workspace reads and `context.options` for workspace-local plugin settings
- default filters, file colors, Node Types, Edge Types, symbols, and relationship evidence

Plugins should stay headless. They communicate with `@codegraphy/core`; the VS Code extension communicates with VS Code and renders CodeGraphy UI.

Core now owns the default explorer-style file and folder theming through Material Icon Theme. The built-in TypeScript, Python, C#, and Markdown plugins are intentionally minimal now: they mostly contribute ecosystem defaults, filters, and optional semantic enrichment instead of baseline file coloring.

For timeline compatibility, third-party plugins should avoid reading the live workspace directly during analysis. Use the plugin hook `context` instead so the same plugin can resolve files from either the current workspace or a historical commit snapshot.

## Packaging model

Language plugins ship as headless npm packages that are consumed by `@codegraphy/core`.

Installation and enablement are separate:

- `npm i -g @codegraphy/plugin-python` installs a plugin package for the developer's toolchain.
- `codegraphy plugins refresh` records installed `@codegraphy/*` plugin packages in `~/.codegraphy/plugins.json`.
- `codegraphy plugins add <package>` records an explicitly named globally installed plugin package, including private or non-`@codegraphy` packages.
- `codegraphy plugins enable <package> [workspace]` writes that plugin into the workspace-local `plugins` array.
- `codegraphy plugins disable <package> [workspace]` removes that plugin from the workspace-local enabled set.
- Enabling and disabling plugins do not run Indexing automatically; run `codegraphy index [workspace]` to refresh the Graph Cache.
- `@codegraphy/core` depends on `@codegraphy/plugin-markdown` and materializes it as the first enabled plugin when a new CodeGraphy Workspace is indexed for the first time.

Plugin packages declare CodeGraphy metadata in `package.json` so discovery can validate compatibility without importing arbitrary runtime code:

```json
{
  "name": "@codegraphy/plugin-python",
  "version": "1.2.3",
  "type": "module",
  "main": "./dist/plugin.js",
  "types": "./dist/plugin.d.ts",
  "exports": {
    ".": {
      "types": "./dist/plugin.d.ts",
      "default": "./dist/plugin.js"
    }
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

When Indexing loads an enabled package, `@codegraphy/core` merges `codegraphy.defaultOptions` from the package manifest with the workspace entry's `options` object. Workspace options win. The merged object is passed to `initialize`, `onPreAnalyze`, `onFilesChanged`, and `analyzeFile` as `context.options`, so the same plugin package can run with different settings in different CodeGraphy Workspaces.

## Plugin author setup

Install the type package:

```bash
pnpm add -D @codegraphy/plugin-api
```

Minimal usage:

```ts
import type { IPlugin } from '@codegraphy/plugin-api';
```

Use `import type` because the package is type-only.

## Package name migration

The public npm scope is `@codegraphy/*`.

- Replace `@codegraphy-vscode/plugin-api` with `@codegraphy/plugin-api`.
- Replace `@codegraphy-vscode/mcp` with `@codegraphy/mcp`.
- Install first-party language plugins as npm packages such as `@codegraphy/plugin-python`, not as VS Code Marketplace companion extensions.

The VS Code Marketplace extension id remains `codegraphy.codegraphy`.

## Analysis model

`@codegraphy/core` owns discovery, workspace-local Settings, caching, Graph Projection, and plugin analysis. Plugins contribute analysis on top of that pipeline and can:

- return per-file analysis results with relationships, symbols, and extra nodes
- add Node Types
- add Edge Types
- contribute language or framework-specific semantics
- add plugin-owned relationship evidence without directly deleting or suppressing core baseline relationships

Built-in plugins follow the same rules as external plugins and appear in the **Plugins** popup. Enabled plugins run after core in the order stored in the workspace `plugins` array. That order keeps Graph Cache output deterministic and can resolve duplicate ids, but plugins should treat analysis as additive rather than as hidden semantic authority over core output.

For node styling, the host resolves layers in this order:

1. core defaults
2. plugin defaults
3. custom user Legend Entries

In practice, deterministic duplicate handling means:

- `nodes`, `symbols`, `nodeTypes`, and `edgeTypes` override by matching `id`
- imports/reexports/loads/inherits override when they describe the same source relationship
- distinct call/reference targets stay separate so symbol-aware routing is preserved

Markdown-style wikilink scanning is implemented as a wildcard plugin so it can inspect any file, not just `.md` files.

### Structured plugin analysis

Plugins can combine core parser results, plugin-owned parsers, and text fallbacks inside one package. They do not need to declare a separate analysis tier.

`@codegraphy/plugin-godot` is the first structured-analysis showcase. It keeps one npm package, but routes GDScript through `@gdquest/lezer-gdscript` and Godot `.tscn` / `.tres` files through `@fernforestgames/godot-resource-parser` before emitting the same relationship and Symbol Node output. The plugin still keeps text-analysis fallbacks for parser gaps and `project.godot` settings, which shows how a plugin can lean on external ecosystem packages without introducing a Godot LSP process or VS Code-specific dependency.
