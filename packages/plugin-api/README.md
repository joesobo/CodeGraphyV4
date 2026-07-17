# `@codegraphy-dev/plugin-api`

Type definitions for building CodeGraphy plugins.

- [CodeGraphy VS Code extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [Plugin Guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Plugin lifecycle](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/LIFECYCLE.md)
- [Plugin types](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/TYPES.md)
- [Plugin events](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/EVENTS.md)

## Install

```bash
npm install -D @codegraphy-dev/plugin-api
```

## Usage

```ts
import type { IPlugin, IPluginFactory } from '@codegraphy-dev/plugin-api';
```

This package is type-only. Use `import type` in plugin code.

Main surfaces in the current API:

- per-file analysis objects with symbols, relationships, and Node Type / Edge Type contributions
- Graph Scope capabilities through `contributeGraphScopeCapabilities({ filePaths })`, so Graph Scope can show relevant Node Type and Edge Type toggles for an indexed workspace even before the current graph has matching nodes or relationships
- default styling via `fileColors`, which already lets a plugin contribute Legend styling for extension matches, exact file names, and glob patterns
- package plugin factories can receive `IPluginFactoryOptions` with merged workspace options and a plugin-owned data host
- analysis hooks receive an optional `context` with a host-backed file-system adapter for workspace-relative reads without using raw Node `fs`
- lifecycle hooks for headless analysis: `initialize`, `onWorkspaceReady`, `onPreAnalyze`, `onFilesChanged`, `analyzeFile`, `onPostAnalyze`, `onGraphRebuild`, and `onUnload`

Recommended plugins keep analysis headless and use host-agnostic webview assets only when they need UI. They communicate with `@codegraphy-dev/core`; the VS Code extension owns VS Code-specific commands and editor integration.

The public API exposes host-agnostic Graph View contracts, package webview asset declarations, plugin data, and host actions such as exporters. VS Code-specific bridge types, decorations, and the raw graph-renderer instance intentionally stay inside `@codegraphy-dev/extension`.

Webview plugins can persist their own workspace UI state with
`api.getPluginData()` and `api.setPluginData(data)`. The host stores that data
by Plugin ID and replays updates only to the owning plugin, so plugin UI can
remember settings without adding extension-owned settings keys.

Webview plugins can inject UI into named CodeGraphy slots with
`api.registerSlotContribution(slot, { id, order, render })`. The host creates
the slot container, orders contributions, and disposes the returned cleanup when
the plugin is disabled or reset.

Webview plugin `activate(api)` functions may return a cleanup function or
`Disposable`. CodeGraphy calls that cleanup when the plugin is disabled or its
webview assets are reset, so plugins should release animation loops, DOM
subscriptions, timers, and injected styles from that cleanup.

Package plugins need static metadata before Core can import runtime code. Put package compatibility, default options, and disclosures in `package.json#codegraphy`; put the Plugin ID and display metadata in `codegraphy.json`:

```json
{
  "$schema": "./codegraphy.schema.json",
  "id": "acme.plugin",
  "name": "Acme Plugin",
  "version": "1.0.0",
  "apiVersion": "^3.0.0",
  "supportedExtensions": [".ts"]
}
```

The runtime plugin object's `id` must match `codegraphy.json#id`.

Core runs its own base analysis first. Plugin `analyzeFile(...)` results are then merged additively in the workspace plugin order. Plugins should add more specific evidence instead of deleting or suppressing core baseline relationships.

Current Legend Layer precedence in the host is:

1. core defaults
2. plugin defaults
3. custom user Legend Entries

That means a plugin can contribute default Legend styling for its own files or concepts, and a user can layer custom Legend Entries above built-in defaults through the Legends and Plugins popups.

Exact merge behavior:

- `nodeTypes`, `edgeTypes`, `nodes`, `symbols`: merge by `id`
- `relations`: merge by relationship identity
  - imports/loads/inherits override by shared source identity
  - distinct call/reference targets coexist

Node Type and Edge Type definitions are separate from workspace relevance. Use `contributeNodeTypes()` or `contributeEdgeTypes()` when a plugin owns new labels, colors, defaults, and descriptions. Use `contributeGraphScopeCapabilities(context)` to declare which core or plugin-owned Node Types and Edge Types are relevant when the plugin is enabled and applicable to the indexed workspace:

```ts
const plugin: IPlugin = {
  id: 'acme.plugin',
  name: 'Acme Plugin',
  version: '1.0.0',
  apiVersion: '^3.0.0',
  supportedExtensions: ['.ts'],
  contributeGraphScopeCapabilities({ filePaths }) {
    const hasTypeScript = filePaths.some((filePath) => filePath.endsWith('.ts'));
    return hasTypeScript
      ? {
          nodeTypes: ['symbol:function', 'symbol:class', 'symbol:interface', 'symbol:type'],
          edgeTypes: ['import', 'call', 'inherit'],
        }
      : { nodeTypes: [], edgeTypes: [] };
  },
};
```

The `context.filePaths` array contains indexed workspace files that made the plugin applicable, so multi-language plugins can return a precise union instead of one broad package-level list. Capability declarations are not emitted graph records; they only let Graph Scope present the right toggles before matching nodes or edges exist.

When a workspace disables a plugin, CodeGraphy treats that plugin as inactive for graph analysis and Graph View UI contributions. Disabled plugins do not contribute filter groups, Node Types, Edge Types, Graph Scope capabilities, Graph View toolbar/context/export actions, runtime graph contributions, or webview assets until they are enabled again.

Path and source rules:

- `filePath`, `fromFilePath`, and resolved `toFilePath` values are absolute workspace paths
- unresolved package/runtime targets should use `toFilePath: null`
- `sourceId` in plugin output is plugin-local, like `wikilink` or `import`
- the host qualifies provenance later, for example `codegraphy.markdown:wikilink`

Symbol analysis:

- `symbols` describe declarations discovered in a file. Each symbol should have a stable plugin-local `id`, `name`, `kind`, and absolute `filePath`.
- Optional `range` and `signature` values make navigation, exports, and Graph Query CLI results more precise.
- Symbol metadata can include scalar fields such as `language`, `source`, and `pluginKind`; the host preserves these for Legend scoping, exports, and Graph Query payloads.
- `relations` can point at symbols with `fromSymbolId` and `toSymbolId`. The host projects those endpoints into Symbol Nodes and connects files to symbols with `contains` edges.
- Variable-like symbol kinds such as `variable`, `constant`, and `field` project as Variable Nodes under the Symbols Graph Scope. More specific language kinds project as Symbol Nodes unless a plugin contributes its own Node Type and Legend defaults.

Host-backed analysis reads:

- `analyzeFile(...)`, `onPreAnalyze(...)`, and `onFilesChanged(...)` may receive `context`
- `context.fileSystem` exposes `exists`, `isFile`, `isDirectory`, `listDirectory`, and `readTextFile`
- prefer `context.fileSystem` over raw Node `fs` when plugin behavior depends on workspace state, config files, or sibling files

Minimal working plugin object:

```ts
const plugin: IPlugin = {
  id: 'acme.plugin',
  name: 'Acme Plugin',
  version: '1.0.0',
  apiVersion: '^3.0.0',
  supportedExtensions: ['.ts'],
};
```

Minimal package factory with workspace-owned plugin data:

```ts
const createPlugin: IPluginFactory = ({ dataHost } = {}) => ({
  id: 'acme.plugin',
  name: 'Acme Plugin',
  version: '1.0.0',
  apiVersion: '^3.0.0',
  supportedExtensions: [],
  async initialize() {
    await dataHost?.saveData({ expanded: true });
  },
});

export default createPlugin;
```

The published CodeGraphy plugin packages use the same API surface:

- [`@codegraphy-dev/plugin-typescript`](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript)
- [`@codegraphy-dev/plugin-godot`](https://www.npmjs.com/package/@codegraphy-dev/plugin-godot)
- [`@codegraphy-dev/plugin-markdown`](https://www.npmjs.com/package/@codegraphy-dev/plugin-markdown)
