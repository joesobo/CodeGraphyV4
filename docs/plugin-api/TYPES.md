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
- Optional hooks: `initialize`, `onLoad`, `onWorkspaceReady`, `onWebviewReady`, `onPreAnalyze`, `onPostAnalyze`, `onGraphRebuild`, `onUnload`.

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

Main groups:
- Events: `on`, `once`, `off`
- Decorations: `decorateNode`, `decorateEdge`, `clearDecorations`
- Graph queries: `getGraph`, `getNode`, `getNeighbors`, `getIncomingEdges`, `getOutgoingEdges`, `getEdgesFor`, `filterEdgesByKind`, `getSubgraph`, `findPath`
  - these read from the projected repo-local index and current graph state, not only transient in-memory plugin output
- Registration: `registerView`, `registerCommand`, `registerContextMenuItem`, `registerExporter`, `registerToolbarAction`
  - `registerView` is for plugin-defined graph transforms the host may expose as optional custom views; the built-in graph experience is now one unified surface rather than separate core Connections/Folder/Depth views
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
- `IConnectionDetector<TContext>`
- `IConnection` with `kind`, `sourceId`, optional `type`, optional `variant`, and scalar-only `metadata`
- `IPluginFileColorDefinition` with `color`, optional `shape2D`, optional `shape3D`, and optional `imagePath`

These types mainly support projected edges, provenance toggles, and compatibility with the graph/export layer. The primary plugin analysis surface is `analysis.ts`.

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

Plugin views are optional graph transforms layered on top of the unified graph surface. They are no longer the built-in way users switch between `Connections`, `Folder`, and `Depth` views.

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
