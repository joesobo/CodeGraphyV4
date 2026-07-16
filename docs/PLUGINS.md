# Plugin Guide

CodeGraphy plugins are headless npm packages consumed by `@codegraphy-dev/core`.

The VS Code extension visualizes CodeGraphy data and renders plugin controls, but plugin packages do not activate through VS Code and should not import `vscode`.

## Published plugins

- [CodeGraphy VS Code extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)
- [`@codegraphy-dev/plugin-typescript`](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript)
- [`@codegraphy-dev/plugin-godot`](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot)
- [`@codegraphy-dev/plugin-markdown`](https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown)
- [`@codegraphy-dev/plugin-vue`](https://www.npmjs.com/package/@codegraphy-dev/plugin-vue)
- [`@codegraphy-dev/plugin-svelte`](https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte)

## Start here

- [Plugin lifecycle](./plugin-api/LIFECYCLE.md)
- [Plugin types](./plugin-api/TYPES.md)
- [Plugin events](./plugin-api/EVENTS.md)

The current plugin API supports more than file analysis:

- per-file analysis objects with symbols, relationships, Node Types, and Edge Types
- `analyzeFile(...)` is the required analysis path for plugins that contribute code analysis
- `onFilesChanged(...)` is the incremental save hook for plugins that maintain cross-file indexes
- analysis hooks receive an optional `context` object; use `context.fileSystem` for host-backed workspace reads and `context.options` for workspace-local plugin settings
- default filters, file colors, Node Types, Edge Types, symbols, and relationship evidence

Plugins should stay headless. They communicate with `@codegraphy-dev/core`; the VS Code extension communicates with VS Code and renders CodeGraphy UI.

Core now owns the default explorer-style file and folder theming through Material Icon Theme. First-party plugins contribute package-owned defaults, filters, and optional semantic enrichment instead of baseline file coloring.

Third-party plugins should avoid reading the workspace directly during analysis. Use the plugin hook `context` so file access remains host-owned and testable.

## Packaging model

Language plugins ship as headless npm packages that are consumed by `@codegraphy-dev/core`.

Installation and enablement are separate:

- The VS Code extension bundles `@codegraphy-dev/core` for extension runtime behavior, but terminal plugin management starts by installing the Core Package globally.
- `npm i -g @codegraphy-dev/core` installs the terminal `codegraphy` command.
- `npm i -g @codegraphy-dev/plugin-vue` installs a plugin package for the developer's toolchain.
- `codegraphy plugins register <package>` records one globally installed plugin package in the user-level Plugin Registry after validating its CodeGraphy metadata.
- `codegraphy plugins link <package-root>` records a local package checkout directly in `~/.codegraphy/plugins.json`, which is the preferred local-development path for private plugins.
- `codegraphy plugins enable <plugin-id-or-package> [workspace]` writes `enabled: true` Plugin ID activity into the workspace-local `plugins` array.
- `codegraphy plugins disable <plugin-id-or-package> [workspace]` writes `enabled: false` Plugin ID activity into the workspace-local `plugins` array.
- `[workspace]` is an optional trailing positional argument. When it is omitted, plugin enablement commands target the process current working directory exactly. CodeGraphy does not walk upward to find a parent repo or existing `.codegraphy` folder.
- Enabling and disabling plugins do not run Indexing automatically. Users can enable several plugins first, then run `codegraphy index [workspace]` once to refresh the Graph Cache.
- `@codegraphy-dev/core` depends on `@codegraphy-dev/plugin-markdown` and materializes `codegraphy.markdown` as the first `enabled: true` plugin when a new CodeGraphy Workspace is indexed for the first time.

Plugin packages declare package-level CodeGraphy metadata in `package.json` so registration can validate compatibility without importing arbitrary runtime code:

```json
{
  "name": "@codegraphy-dev/plugin-vue",
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
    "apiVersion": "^3.0.0",
    "defaultOptions": {
      "includeTests": true
    },
    "disclosures": []
  }
}
```

The same package must also include a static `codegraphy.json` descriptor. Core reads this file before runtime import; its `id` is the Plugin ID written into workspace settings and used for enablement, conflicts, provenance, Plugin Data, and Graph View contribution ownership.

```json
{
  "$schema": "./codegraphy.schema.json",
  "id": "codegraphy.vue",
  "name": "Vue",
  "version": "1.0.0",
  "apiVersion": "^3.0.0",
  "supportedExtensions": [".vue"],
  "defaultFilters": []
}
```

`codegraphy.json#id` is required for `codegraphy plugins register` and `codegraphy plugins link`. `name` and `supportedExtensions` let CodeGraphy Interfaces render installed-but-disabled plugins from static metadata without importing or factory-creating the runtime. The runtime plugin object's `id` must match `codegraphy.json#id`.

The npm package's normal `exports` field owns runtime import behavior. The `package.json#codegraphy` block is for package compatibility, optional default options, and optional capability disclosures. Plugin runtime loading happens during explicit Indexing or targeted plugin refresh, not during install, register, link, list, enable, or disable commands.

For local private plugin development, keep the private source outside this public monorepo and link its package root:

```bash
codegraphy plugins link ~/src/acme-graph-tools
codegraphy plugins enable acme.graph-tools /path/to/indexed-folder
codegraphy index /path/to/indexed-folder
```

When testing through F5, launch only the public CodeGraphy VS Code extension. Do not add headless plugin package folders to VS Code's `extensionDevelopmentPath`; the extension host loads linked packages from `~/.codegraphy/plugins.json` and the opened workspace's `.codegraphy/settings.json`.

The `Run Extension` launch config runs `pnpm run build:devhost` before opening the Extension Development Host. That command builds the public extension, builds the local public language plugin packages, links those packages into `~/.codegraphy/plugins.json`, and best-effort links a local `@codegraphy-pro/organize` package when `CODEGRAPHY_ORGANIZE_PLUGIN_ROOT`, `CODEGRAPHY_PRO_PLUGINS_REPO`, or the standard sibling/private checkout path is present. It only upserts plugin registry entries; package enablement still belongs to the opened workspace and the Plugins panel.

The Plugins panel is a workspace Plugin ID toggle surface backed by static package metadata. It shows installed package-backed plugins that can be enabled, disabled, and reordered for the current CodeGraphy Workspace. Core runtime internals such as Tree-sitter, and legacy VS Code extension plugin entries without a package backing, are not shown as plugin toggle rows.

Disabling a plugin writes `enabled: false` for that Plugin ID in the workspace `plugins` array and unloads its runtime immediately. Package-owned persisted data may remain on disk, but its Graph View nodes, forces, context menu entries, toolbar create entries, webview injections, and UI slots only render while that Plugin ID is enabled and loaded. The Graph View host broadcasts the refreshed plugin status and contribution state immediately after a toggle. Disabling a plugin rebuilds the Graph View from cached analysis instead of rerunning full Indexing. Enabling an analyzer plugin first tries to hydrate that plugin-owned evidence tier from Graph Cache into runtime memory; if the tier is missing, CodeGraphy refreshes only the plugin-owned analysis tier for supported files. Once loaded, that tier remains resident for future toggles, and normal file edits patch changed Graph Cache rows instead of resaving the full cache.

When Indexing loads an enabled package, `@codegraphy-dev/core` merges `codegraphy.defaultOptions` from the package manifest with the workspace entry's `options` object. Workspace options win. The merged object is passed to package plugin factories as `factoryOptions.options`, and to `initialize`, `onPreAnalyze`, `onFilesChanged`, and `analyzeFile` as `context.options`, so the same plugin package can run with different settings in different CodeGraphy Workspaces.

Package factories also receive a workspace-scoped `factoryOptions.dataHost` when the package is loaded for a concrete CodeGraphy Workspace:

```ts
import type { IPluginFactory } from '@codegraphy-dev/plugin-api';

const createPlugin: IPluginFactory = ({ dataHost, options } = {}) => ({
  id: 'acme.graph-tools',
  name: 'Acme Graph Tools',
  version: '1.0.0',
  apiVersion: '^3.0.0',
  supportedExtensions: [],
  async initialize() {
    await dataHost?.saveData({ mode: options?.mode ?? 'default' });
  },
});

export default createPlugin;
```

The data host persists under the Plugin ID declared in `codegraphy.json` and returned by the factory, not under the npm package name. Use it from lifecycle hooks, analysis hooks, and Graph View contributions after the factory returns.

Default options are copied into workspace settings when the plugin is enabled so the user can see and edit the starting values for that workspace. For example, enabling a Godot plugin whose package manifest contains:

```json
{
  "codegraphy": {
    "type": "plugin",
    "apiVersion": "^3.0.0",
    "defaultOptions": {
      "includeSceneResources": true,
      "includeAutoloads": true,
      "includeClassNameUsage": true
    }
  }
}
```

writes a workspace entry like:

```json
{
  "plugins": [
    {
      "id": "codegraphy.gdscript",
      "enabled": true,
      "options": {
        "includeSceneResources": true,
        "includeAutoloads": true,
        "includeClassNameUsage": true
      }
    }
  ]
}
```

If that workspace later disables `includeClassNameUsage`, the effective runtime options become:

```json
{
  "includeSceneResources": true,
  "includeAutoloads": true,
  "includeClassNameUsage": false
}
```

## Update impact metadata

Plugin manifests declare `updateImpact` so CodeGraphy can choose the fastest
safe path when a user toggles a plugin or changes plugin-owned settings:

```json
{
  "updateImpact": {
    "toggle": "reanalyze-plugin-files",
    "defaultSetting": "reanalyze-plugin-files",
    "settings": {
      "showOverlay": "projection-only",
      "themePreset": "settings-only"
    }
  }
}
```

Impact levels:

- `view-only` updates plugin UI only.
- `settings-only` persists settings and broadcasts plugin data without graph work.
- `projection-only` rebuilds the visible graph from runtime memory.
- `reanalyze-plugin-files` refreshes only files owned by that plugin.
- `requires-full-index` runs a full workspace index.

Analyzer plugins should use `reanalyze-plugin-files` for toggles and analysis
options. Visual plugins should use `projection-only` or `settings-only` so users
can adjust them without Graph Cache progress restarting. When an analyzer plugin
is enabled, CodeGraphy first tries to hydrate that plugin's evidence tier from
Graph Cache into runtime memory. If that tier is missing or stale, CodeGraphy
falls back to the targeted plugin-file refresh path.

## Plugin author setup

Install the type package:

```bash
pnpm add -D @codegraphy-dev/plugin-api
```

Minimal usage:

```ts
import type { IPlugin } from '@codegraphy-dev/plugin-api';
```

Use `import type` because the package is type-only.

## Package name migration

The public npm scope is `@codegraphy-dev/*`.

- Replace old vscode-specific or unavailable CodeGraphy npm scope references with `@codegraphy-dev/*`.
- Install first-party language plugins as npm packages such as `@codegraphy-dev/plugin-vue`, not as VS Code Marketplace companion extensions.

The VS Code Marketplace extension id remains `codegraphy.codegraphy`.

## Analysis model

`@codegraphy-dev/core` owns discovery, workspace-local Settings, caching, Graph Projection, and plugin analysis. Plugins contribute analysis on top of that pipeline and can:

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
- imports/loads/inherits override when they describe the same source relationship
- distinct call/reference targets stay separate so symbol-aware routing is preserved

Markdown-style wikilink scanning is implemented as a wildcard plugin so it can inspect any file, not just `.md` files.

### Structured plugin analysis

Plugins can combine core parser results, plugin-owned parsers, and text fallbacks inside one package. They do not need to declare a separate analysis tier.

`@codegraphy-dev/plugin-godot` is the first structured-analysis showcase. It keeps one npm package, but routes GDScript through `@gdquest/lezer-gdscript` and Godot `.tscn` / `.tres` files through `@fernforestgames/godot-resource-parser` before emitting the same relationship and Symbol Node output. The plugin still keeps text-analysis fallbacks for parser gaps and `project.godot` settings, which shows how a plugin can lean on external ecosystem packages without introducing a Godot LSP process or VS Code-specific dependency.

`@codegraphy-dev/plugin-vue` and `@codegraphy-dev/plugin-svelte` follow the same principle for Single-File Components. Vue SFCs are parsed with `@vue/compiler-sfc`, and Svelte components are parsed with `svelte/compiler`, so each plugin can reuse framework-owned block parsing before emitting ordinary CodeGraphy import, type-import, and lazy import relationships.
