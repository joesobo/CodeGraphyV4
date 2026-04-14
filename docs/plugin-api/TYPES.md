# Plugin API Types

![Type Surface Diagram](./diagrams/type-surface.excalidraw)

Diagram source: `docs/plugin-api/diagrams/type-surface.excalidraw`

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
  CodeGraphyAPI,
  EventName,
  EventPayloads,
  IConnectionSource,
  IGraphNode,
  IGraphEdge,
  IGraphData,
  NodeDecoration,
  EdgeDecoration,
  IView,
  IViewContext,
  ICommand,
  IContextMenuItem,
  Disposable,
  ExportRequest,
  IExporter,
  IToolbarAction,
  IToolbarActionItem,
  ViewDependency,
} from '@codegraphy-vscode/plugin-api';

import type {
  CodeGraphyWebviewAPI,
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
} from '@codegraphy-vscode/plugin-api/webview';
```

## Core Plugin Contract

### `IPlugin`

Defined in `plugin.ts`.

Key points:
- `apiVersion: string` is required (for example `'^2.0.0'`).
- `webviewApiVersion?: string` and `webviewContributions?: { scripts?: string[]; styles?: string[] }` support Tier 2.
- `sources?: IConnectionSource[]` declares the plugin’s relation provenance/source families.
- `fileColors?: Record<string, string | IPluginFileColorDefinition>` lets plugins provide default color/shape/imagePath styling by pattern.
- `analyzeFile(filePath, content, workspaceRoot)` is the plugin analysis hook for returning relations, symbols, and contributed node or edge types.
- core builds the base file result first, then plugin results are merged on top in plugin order.
- `contributeNodeTypes()` and `contributeEdgeTypes()` let plugins register new graph controls and defaults.
- Optional hooks: `initialize`, `onLoad`, `onWorkspaceReady`, `onWebviewReady`, `onPreAnalyze`, `onFilesChanged`, `onPostAnalyze`, `onGraphRebuild`, `onUnload`.

### Merge Rules

Higher-priority plugins only override data when both sides hit the same merge key.

- `nodeTypes`, `edgeTypes`, `nodes`, and `symbols` merge by `id`
- `relations` merge by relation identity

Current relation identity:

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
- call/reference relations with different targets remain separate
- graph edges also stay separate when relation `type` or `variant` differs, even if `from`, `to`, and `kind` match

### `IAnalysisFile`

```typescript
interface IAnalysisFile {
  absolutePath: string;
  relativePath: string;
  content: string;
}
```

## Host API

### `CodeGraphyAPI`

Defined in `api.ts`.

Main areas:
- Events: `on`, `once`, `off`
- Decorations: `decorateNode`, `decorateEdge`, `clearDecorations`
- Graph queries: `getGraph`, `getNode`, `getNeighbors`, `getIncomingEdges`, `getOutgoingEdges`, `getEdgesFor`, `filterEdgesByKind`, `getSubgraph`, `findPath`
  - these read from the projected repo-local index and current graph state, not only transient in-memory plugin output
- Registration: `registerView`, `registerCommand`, `registerContextMenuItem`, `registerExporter`, `registerToolbarAction`
  - `registerView` is a compatibility / future-facing hook for plugin-defined graph transforms; the current built-in product stays on one unified graph surface rather than exposing separate core Connections/Folder/Depth views
- Tier 2 bridge: `sendToWebview`, `onWebviewMessage`
- Export saving: `saveExport`
- Utilities: `getWorkspaceRoot`, `log`

## Data Types

### Analysis (`analysis.ts`)

- `IAnalysisNode`
- `IAnalysisSymbol`
- `IAnalysisRelation`
- `IFileAnalysisResult`
- `IPluginNodeType`
- `IPluginEdgeType`

### Connections and Provenance (`connection.ts`)

- `IConnectionSource`
- `IPluginFileColorDefinition` with `color`, optional `shape2D`, optional `shape3D`, and optional `imagePath`

`connection.ts` is now only about source metadata: the relation families a plugin declares in `sources` so the host can preserve provenance in graph edges, inspectors, and exports.

The public plugin API no longer exposes the old `IConnection` / `IConnectionDetector` analysis types. Plugins return `IFileAnalysisResult` objects from `analyzeFile(...)`, with relations expressed through `IAnalysisRelation`.

`sourceId` is plugin-local. Use ids like `wikilink`, `import`, `preload`, or `call`.

- plugin output: `sourceId: 'wikilink'`
- merged graph provenance later: `id: 'codegraphy.markdown:wikilink'`

If you see projected file-to-file edges inside the extension codebase, those are extension-internal compatibility shapes used by the current graph/timeline pipeline. They are not part of the public plugin API.

### Graph (`graph.ts`)

- `NodeType` = core `file | folder | package` plus plugin-defined string node kinds
- `IGraphNode` (id/label/color + optional position/favorite/size/access/depth fields)
- `IGraphEdge` (`id`, `from`, `to`, `kind`, `sources[]`)
- `IGraphEdgeSource` (`id`, `pluginId`, `sourceId`, `label`, optional `variant`, optional scalar `metadata`)
- `IGraphData` (`nodes`, `edges`)
- `GraphEdgeKind` = reserved core kinds plus namespaced custom kinds (`pluginId:kind`)
- Synthetic package nodes let plugins and host views include unresolved external imports like `fs` or `react` without pretending they are workspace files.

### Decorations (`decorations.ts`)

- `NodeDecoration`: `badge`, `border`, `tooltip.sections`, `label`, `size`, `opacity`, `color`, `icon`, `group`, `priority`
- `EdgeDecoration`: `color`, `width`, `style`, `label`, `particles`, `opacity`, `curvature`, `priority`
- `TooltipSection`: `title`, `content`

### Views and Commands

- `IView`, `IViewContext`, `ViewDependency` in `views.ts`
- `ICommand`, `IContextMenuItem` in `commands.ts`
- `IExporter`, `ExportRequest`, `IToolbarAction`, `IToolbarActionItem` in `api.ts`
- `Disposable` in `disposable.ts`

Plugin views are an optional compatibility surface for graph transforms layered on top of the unified graph. They are not the built-in way users switch the graph anymore, and the current host experience stays centered on one unified surface.

## Webview Types (Tier 2)

From `@codegraphy-vscode/plugin-api/webview`:

- `CodeGraphyWebviewAPI`
- `NodeRenderContext`, `NodeRenderFn`
- `OverlayRenderContext`, `OverlayRenderFn`
- `TooltipContext`, `TooltipContent`, `TooltipProviderFn`
- Drawing helper option types: `BadgeOpts`, `RingOpts`, `LabelOpts`

## Package Export Notes

`@codegraphy-vscode/plugin-api` is currently a type-definition package with `types` exports for:
- `@codegraphy-vscode/plugin-api`
- `@codegraphy-vscode/plugin-api/events`
- `@codegraphy-vscode/plugin-api/plugin`
- `@codegraphy-vscode/plugin-api/webview`

Use `import type` for these symbols in plugin code.
