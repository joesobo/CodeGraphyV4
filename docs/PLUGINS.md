# Plugin Guide

CodeGraphy plugins are headless npm packages loaded by `@codegraphy-dev/core`. They can add analysis, graph types, filters, styling defaults, exports, context actions, toolbar actions, and webview assets without activating as VS Code extensions.

Start with the API references:

- [Lifecycle](./plugin-api/LIFECYCLE.md)
- [Types](./plugin-api/TYPES.md)
- [Events](./plugin-api/EVENTS.md)
- [`@codegraphy-dev/plugin-api`](../packages/plugin-api/README.md)

## Install and Enable

Plugin installation, registration, and workspace enablement are separate:

```bash
npm install -g @codegraphy-dev/core
npm install -g @codegraphy-dev/plugin-vue
codegraphy plugins register @codegraphy-dev/plugin-vue
codegraphy plugins enable @codegraphy-dev/plugin-vue
codegraphy index
```

The global Plugin Registry lives at `~/.codegraphy/plugins.json`. Workspace activity lives in `<workspace>/.codegraphy/settings.json`.

Commands target the current directory. Put `-C, --workspace <path>` before the command to select another workspace:

```bash
codegraphy -C /path/to/workspace plugins enable @codegraphy-dev/plugin-vue
codegraphy -C /path/to/workspace index
```

CodeGraphy does not search parent directories for a workspace. Enabling or disabling a plugin changes settings but does not automatically run Indexing. Enable the plugins you need, then run `codegraphy index` once.

Published first-party plugins:

- [`@codegraphy-dev/plugin-typescript`](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript)
- [`@codegraphy-dev/plugin-godot`](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot)
- [`@codegraphy-dev/plugin-unity`](https://www.npmjs.com/package/@codegraphy-dev/plugin-unity)
- [`@codegraphy-dev/plugin-markdown`](https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown)
- [`@codegraphy-dev/plugin-particles`](https://www.npmjs.com/package/@codegraphy-dev/plugin-particles)
- [`@codegraphy-dev/plugin-vue`](https://www.npmjs.com/package/@codegraphy-dev/plugin-vue)
- [`@codegraphy-dev/plugin-svelte`](https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte)

## Package Contract

A plugin package needs normal npm exports, a `package.json#codegraphy` block, and a static `codegraphy.json` descriptor.

```json
{
  "name": "@acme/codegraphy-plugin",
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

Core reads `codegraphy.json` before it imports runtime code:

```json
{
  "id": "acme.graph-tools",
  "name": "Acme Graph Tools",
  "version": "1.2.3",
  "apiVersion": "^3.0.0",
  "supportedExtensions": [".ts", ".tsx"],
  "defaultFilters": [],
  "updateImpact": {
    "toggle": "reanalyze-plugin-files",
    "defaultSetting": "reanalyze-plugin-files"
  }
}
```

`codegraphy.json#id` is the stable Plugin ID used for workspace activity, conflicts, provenance, Plugin Data, and Graph View ownership. The runtime plugin object's `id` must match it. The npm package name identifies an installed package; it does not replace the Plugin ID.

Static metadata lets Core list, validate, enable, disable, or reject a package without executing its runtime.

## Runtime Contract

Install the type package:

```bash
pnpm add -D @codegraphy-dev/plugin-api
```

Minimal factory:

```ts
import type { IPluginFactory } from '@codegraphy-dev/plugin-api';

const createPlugin: IPluginFactory = ({ dataHost, options } = {}) => ({
  id: 'acme.graph-tools',
  name: 'Acme Graph Tools',
  version: '1.2.3',
  apiVersion: '^3.0.0',
  supportedExtensions: ['.ts', '.tsx'],
  async initialize() {
    await dataHost?.saveData({ mode: options?.mode ?? 'default' });
  },
});

export default createPlugin;
```

Use `import type` because `@codegraphy-dev/plugin-api` is type-only. Do not import `vscode` from a plugin package.

Core merges package `defaultOptions` with workspace plugin `options` before it creates the factory. Workspace values win. Hooks receive the same merged values through `context.options`.

Plugin-owned state belongs in `factoryOptions.dataHost` or the webview API's `getPluginData()` and `setPluginData()`. CodeGraphy persists it under `pluginData[pluginId]`. Do not use Plugin Data for enablement.

## Analysis

Core runs built-in analysis first, then enabled plugins in workspace order. Plugins add evidence rather than suppressing Core output.

Useful hooks include:

- `initialize(...)`
- `onPreAnalyze(...)`
- `analyzeFile(...)`
- `onFilesChanged(...)`
- `onPostAnalyze(...)`
- `onGraphRebuild(...)`
- `onWorkspaceReady(...)`
- `onUnload(...)`

Analysis hooks receive a host-backed `context.fileSystem`. Use it for workspace reads instead of raw Node `fs`, which keeps behavior portable and testable.

Per-file results can contribute Nodes, Symbols, Relationships, Node Type Definitions, and Edge Type Definitions. Use `contributeGraphScopeCapabilities({ filePaths })` to declare which types are relevant for the indexed workspace even when the current graph has no matching item.

Paths in analysis results are absolute workspace paths. Unresolved external targets use `toFilePath: null`. Keep `sourceId` plugin-local; Core qualifies provenance with the Plugin ID.

Merge rules:

- `nodes`, `symbols`, `nodeTypes`, and `edgeTypes` merge by ID.
- Relationships merge by relationship identity.
- Separate call and reference targets remain separate.

## Graph View Contributions

The public API exposes host-agnostic contracts for:

- default filters and Legend styling
- Graph Scope definitions and capabilities
- toolbar and context-menu actions
- exporters
- webview assets and named UI slots
- plugin-owned Graph View data

The VS Code extension owns editor actions, raw renderer access, and the host bridge. Plugins communicate through the public API.

Webview `activate(api)` functions may return a cleanup function or `Disposable`. Release animation frames, event listeners, timers, and injected styles in that cleanup. CodeGraphy calls it when the plugin disables or resets its webview assets.

## Update Impact

`codegraphy.json#updateImpact` tells Core how much work a toggle or settings change requires:

| Value | Work |
|---|---|
| `view-only` | Update plugin UI. |
| `settings-only` | Persist and broadcast settings. |
| `projection-only` | Rebuild the Visible Graph from runtime data. |
| `reanalyze-plugin-files` | Refresh files owned by the plugin. |
| `requires-full-index` | Run full workspace Indexing. |

Analyzer plugins normally use `reanalyze-plugin-files`. Visual plugins normally use `projection-only` or `settings-only`.

Disabling a plugin unloads its runtime and removes its active contributions. Plugin-owned Graph Cache facts can remain dormant for reuse. Projection and Graph Query exclude those facts until the plugin becomes active again.

## Local Development

Link a package checkout instead of copying private plugin source into this monorepo:

```bash
codegraphy plugins link /path/to/acme-graph-tools
codegraphy -C /path/to/workspace plugins enable acme.graph-tools
codegraphy -C /path/to/workspace index
```

When testing through F5, launch the CodeGraphy extension only. Do not add headless plugin packages to `extensionDevelopmentPath`. The extension loads registered packages through Core.

`pnpm run build:devhost` builds the extension and local public plugins, updates the user Plugin Registry, and then launches the normal Extension Development Host path. Workspace enablement remains explicit.
