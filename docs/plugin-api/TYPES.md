# Plugin API Types

This document references the canonical type package in `packages/plugin-api/src`.

## Import Surface

```typescript
import type {
  IPlugin,
  IAnalysisFile,
  IAnalysisNode,
  IAnalysisSymbol,
  IAnalysisRelation,
  IFileAnalysisResult,
  IPluginNodeType,
  IPluginEdgeType,
  EventName,
  EventPayloads,
  IConnectionSource,
  IPluginWebviewAsset,
  IPluginWebviewContributions,
  CodeGraphyWebviewAPI,
  GraphPluginSlot,
  PluginSlotContribution,
  WebviewPluginActivate,
  IGraphNode,
  IGraphEdge,
  IGraphData,
  Disposable,
} from '@codegraphy-dev/plugin-api';
```

The public package is host-agnostic. VS Code-specific bridge types, decorations, and raw extension integration types live in `@codegraphy-dev/extension`; package plugin contracts, Graph View contribution contracts, plugin-owned data contracts, and webview asset/runtime contracts live in `@codegraphy-dev/plugin-api`.

## Core Plugin Contract

### `IPlugin`

Defined in `plugin.ts`.

Key points:
- `apiVersion: string` is required (for example `'^2.0.0'`).
- `sources?: IConnectionSource[]` declares the plugin's Relationship Source families.
- `fileColors?: Record<string, string | IPluginFileColorDefinition>` lets plugins provide default color/shape/imagePath styling by pattern.
- `analyzeFile(filePath, content, workspaceRoot, context?)` is the plugin analysis hook for returning relationships, symbols, and contributed Node Types or Edge Types.
- core builds the base file result first, then plugin results are merged on top in plugin order.
- `contributeNodeTypes()` and `contributeEdgeTypes()` let plugins register new Node Types, Edge Types, defaults, and optional user-facing descriptions for Graph Scope.
- `contributeGraphScopeCapabilities(context)` lets plugins declare core or plugin-owned Node Types and Edge Types that are relevant when the plugin is enabled and applies to the indexed workspace, even if the current graph has no matching nodes or relationships yet. Use `context.filePaths` when one plugin supports several languages or file families with different capabilities.
- Optional hooks: `initialize`, `onWorkspaceReady`, `onPreAnalyze`, `onFilesChanged`, `onPostAnalyze`, `onGraphRebuild`, `onUnload`.

### `IPluginAnalysisContext`

- `fileSystem` is a host-backed adapter with:
  - `exists(filePath)`
  - `isFile(filePath)`
  - `isDirectory(filePath)`
  - `listDirectory(filePath)`
  - `readTextFile(filePath)`

Use this instead of raw Node `fs` when your plugin needs sibling files, config files, or repo-local state.

### Merge Rules

Higher-priority plugins only override data when both sides hit the same merge key.

- `nodeTypes`, `edgeTypes`, `nodes`, and `symbols` merge by `id`
- `relations` merge by relationship identity

Node Type and Edge Type definitions can include an optional `description` object. The description should explain what the type means in product language, not how the analyzer detects it. Use `examples` for compact, real-looking snippets or paths that help users recognize the type in Graph Scope.

Current relationship identity:

- always: `kind`, `sourceId`, `fromFilePath`, `fromNodeId`, `fromSymbolId`, `specifier`, `type`, `variant`
- additionally for `call` and `reference`: `toFilePath`, `toNodeId`, `toSymbolId`, `resolvedPath`

Practical result:

- imports/reexports/loads/inherits with the same source identity override each other
- distinct calls/references to different targets coexist

Example:

```typescript
// Core result
{
  filePath,
  relations: [
    {
      kind: 'import',
      sourceId: 'import',
      fromFilePath: filePath,
      specifier: '@app/shared',
      toFilePath: '/repo/src/shared/index.ts',
    },
  ],
}

// Higher-priority plugin
{
  filePath,
  relations: [
    {
      kind: 'import',
      sourceId: 'import',
      fromFilePath: filePath,
      specifier: '@app/shared',
      toFilePath: '/repo/packages/shared/src/index.ts',
    },
    {
      kind: 'call',
      sourceId: 'call',
      fromFilePath: filePath,
      fromSymbolId: `${filePath}:function:run`,
      toFilePath: '/repo/src/lib-b.ts',
      toSymbolId: '/repo/src/lib-b.ts:function:boot',
      specifier: './lib',
    },
  ],
}
```

Merged result:

- the import keeps only the higher-priority plugin target
- call/reference relationships with different targets remain separate
- graph edges also stay separate when relationship `type` or `variant` differs, even if `from`, `to`, and `kind` match

### `IAnalysisFile`

```typescript
interface IAnalysisFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}
```

## Graph View and Host Surfaces

The public npm Plugin API exposes host-agnostic Graph View contribution contracts for paid and third-party plugins:

- Access Provider checks through `IAccessProvider`
- plugin-owned data through `loadData` / `saveData`
- package factory host services through `IPluginFactoryOptions`
- plugin host access to the current graph snapshot through `IPluginHostApi.getGraph()`, so host actions such as exporters can read the rendered Relationship Graph when they run
- runtime Graph View nodes and edges
- graph projections that run after the free Visible Graph exists
- additive D3 force adapters
- node drag-end policies for plugin-owned fixed-position behavior
- context-menu target selectors for background, node, edge, multi-selection, runtime node type, and runtime edge type
- named UI slots: `graph.toolbar`, `graph.panelSlot`, `graph.stage.worldBackground`, `graph.stage.worldOverlay`, and `graph.stage.viewportOverlay`

The public API still does not expose VS Code-specific `CodeGraphyAPI`, decorations, or the raw force-graph instance. Webview-facing contracts are host-agnostic and scoped to plugin-owned assets, messages, slots, and Graph View contributions.

Headless plugins should express analysis through `IPlugin` hooks and `IFileAnalysisResult`. The CLI and MCP consume the same core analysis path without installing VS Code or webview dependencies.

## Data Types

### Analysis (`analysis.ts`)

- `IAnalysisNode`
- `IAnalysisSymbol`
- `IAnalysisRelation`
- `IFileAnalysisResult`
- `IPluginNodeType`
- `IPluginEdgeType`

### Relationship Provenance (`connection.ts`)

- `IConnectionSource`
- `IPluginFileColorDefinition` with `color`, optional `shape2D`, and optional `imagePath`

`connection.ts` is now only about source metadata: the relationship families a plugin declares in `sources` so the host can preserve Relationship Source provenance in graph edges, inspectors, and exports.

The public plugin API no longer exposes the old `IConnection` / `IConnectionDetector` analysis types. Plugins return `IFileAnalysisResult` objects from `analyzeFile(...)`, with relationships expressed through the `relations` field and `IAnalysisRelation` type.

`sourceId` is plugin-local. Use ids like `wikilink`, `import`, `preload`, or `call`.

- plugin output: `sourceId: 'wikilink'`
- merged graph provenance later: `id: 'codegraphy.markdown:wikilink'`

If you see projected file-to-file edges inside the extension codebase, those are extension-internal compatibility shapes used by the current graph pipeline. They are not part of the public plugin API.

### Graph (`graph.ts`)

- `NodeType` = core `file | folder | package` plus plugin-defined string Node Types
- `IGraphNode` (id/label/color + optional position/favorite/size/access/depth fields)
- `IGraphEdge` (`id`, `from`, `to`, `kind`, `sources[]`)
- `IGraphEdgeSource` (`id`, `pluginId`, `sourceId`, `label`, optional `variant`, optional scalar `metadata`)
- `IGraphData` (`nodes`, `edges`)
- `GraphEdgeKind` = reserved core kinds plus namespaced custom kinds (`pluginId:kind`)
- External Package nodes let plugins and host views include unresolved external imports like `fs` or `react` without pretending they are workspace files.

### Access (`access.ts`)

- `IAccessProvider`
- `IAccessRequest`
- `IAccessResult`
- `CodeGraphyAccessKey`
- `CodeGraphyAccessState`

Hosts and account integrations can report whether paid capabilities are available. Paid plugins declare `requiresAccess` on the plugin or on individual Graph View contributions.

### Plugin Data (`data.ts`)

- `IPluginDataHost`
- `loadData<T>(fallback: T): T`
- `saveData<T>(data: T, options?: { undoLabel?: string }): Promise<void>`

Plugin id implies storage ownership. Hosts persist plugin data under the plugin id instead of asking plugins to register separate namespaces.

### Graph View (`graphView.ts`)

- `IGraphViewRuntimeNodeContribution`
- `IGraphViewRuntimeEdgeContribution`
- `IGraphViewProjectionContribution`
- `IGraphViewForceAdapterContribution`
- `IGraphViewNodeDragEndContribution`
- `IGraphViewContextMenuContribution`
- `IGraphViewUiSlotContribution`

Graph View runtime nodes and edges are display artifacts. They do not become Graph Cache facts and are not exposed as Graph Query relationships unless a plugin also contributes analysis data through Core.

Graph View contributions run from a live host context. `visibleGraph` is the current rendered graph, and `workspaceRoot` is supplied when the host can resolve the current Indexed Folder. Contributions should use these context values at execution time rather than capturing creation-time defaults.

### Webview (`webview.ts`)

- `CodeGraphyWebviewAPI`
- `GraphPluginSlot`
- `PluginSlotContribution`
- `WebviewPluginActivate`
- `WebviewPluginActivationCleanup`

Webview assets are package-owned scripts/styles declared through `IPlugin.webviewContributions`. They can register ordered UI with `api.registerSlotContribution(slot, { id, order, render })`, exchange plugin-scoped messages, read and write plugin-owned webview state through `getPluginData()` and `setPluginData(data)`, and return cleanup work that the host runs when the plugin is disabled or reset.

Runtime node contributions may supply D3 coordinate state (`x`/`y`), fixed coordinate state (`fx`/`fy`), and velocity state (`vx`/`vy`) when a plugin owns its node layout. Core treats those fields like normal graph node physics state, so plugins can keep a runtime node fixed, release it, or hand it back to the force simulation without inventing a separate layout channel.

Node drag-end contributions let a plugin decide whether a dragged node should keep its fixed `fx`/`fy` coordinates after release. Core still owns the graph node coordinate fields; feature-specific behavior such as pinned-node release semantics should live in the plugin that owns that feature.

Context menu contributions render in the normal graph context menu by default. Contributions that set `placement: { menu: 'create' }` join the graph background create actions instead, so the same action appears beside `New File...` and `New Folder...` in the background context menu and in the toolbar `New...` popup while the plugin is enabled.

## Theme-Style Plugins

The current public API already supports a file-theme style plugin through `fileColors`:

- extension matches like `.ts`
- exact file names like `package.json`
- glob patterns like `**/*.stories.tsx`
- optional `shape2D` and `imagePath`

Those plugin defaults sit above core defaults and below custom Legend Entries, so a user can treat them like an installable theme layer for File Nodes. In the current UI that means Material Icon Theme stays in the core layer, plugin defaults are grouped separately, and custom entries still win last.

Current limitation: folder icon theming is still core-only. The API does not yet expose a folder-name or folder-icon contract comparable to the built-in Material Icon Theme integration.

## Package Export Notes

`@codegraphy-dev/plugin-api` is currently a type-definition package with `types` exports for:
- `@codegraphy-dev/plugin-api`
- `@codegraphy-dev/plugin-api/access`
- `@codegraphy-dev/plugin-api/data`
- `@codegraphy-dev/plugin-api/events`
- `@codegraphy-dev/plugin-api/graph-view`
- `@codegraphy-dev/plugin-api/plugin`
- `@codegraphy-dev/plugin-api/webview`

Use `import type` for these symbols in plugin code.
