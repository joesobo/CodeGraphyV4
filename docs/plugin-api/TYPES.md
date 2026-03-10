# Plugin API Types

![Type Surface Diagram](./diagrams/type-surface.excalidraw)

Diagram source: `docs/plugin-api/diagrams/type-surface.excalidraw`

This document references the canonical type package in `packages/plugin-api/src`.

## Import Surface

```typescript
import type {
  IPlugin,
  IAnalysisFile,
  CodeGraphyAPI,
  EventName,
  EventPayloads,
  IConnection,
  IRule,
  IRuleDetector,
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
} from '@codegraphy/plugin-api';

import type {
  CodeGraphyWebviewAPI,
  NodeRenderFn,
  OverlayRenderFn,
  TooltipProviderFn,
} from '@codegraphy/plugin-api/webview';
```

## Core Plugin Contract

### `IPlugin`

Defined in `plugin.ts`.

Key points:
- `apiVersion: string` is required (for example `'^2.0.0'`).
- `webviewApiVersion?: string` and `webviewContributions?: { scripts?: string[]; styles?: string[] }` support Tier 2.
- `detectConnections(filePath, content, workspaceRoot)` is required.
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
- Graph queries: `getGraph`, `getNode`, `getNeighbors`, `getEdgesFor`
- Registration: `registerView`, `registerCommand`, `registerContextMenuItem`
- Tier 2 bridge: `sendToWebview`, `onWebviewMessage`
- Utilities: `getWorkspaceRoot`, `log`

## Data Types

### Connections (`connection.ts`)

- `IRule`
- `IRuleDetector<TContext>`
- `IConnection` with `type: 'static' | 'dynamic' | 'require' | 'reexport'`

### Graph (`graph.ts`)

- `IGraphNode` (id/label/color + optional position/favorite/size/access/depth fields)
- `IGraphEdge` (`id`, `from`, `to`, optional `ruleId`)
- `IGraphData` (`nodes`, `edges`)

### Decorations (`decorations.ts`)

- `NodeDecoration`: `badge`, `border`, `tooltip.sections`, `label`, `size`, `opacity`, `color`, `icon`, `group`, `priority`
- `EdgeDecoration`: `color`, `width`, `style`, `label`, `particles`, `opacity`, `curvature`, `priority`
- `TooltipSection`: `title`, `content`

### Views and Commands

- `IView`, `IViewContext` in `views.ts`
- `ICommand`, `IContextMenuItem` in `commands.ts`
- `Disposable` in `disposable.ts`

## Webview Types (Tier 2)

From `@codegraphy/plugin-api/webview`:

- `CodeGraphyWebviewAPI`
- `NodeRenderContext`, `NodeRenderFn`
- `OverlayRenderContext`, `OverlayRenderFn`
- `TooltipContext`, `TooltipContent`, `TooltipProviderFn`
- Drawing helper option types: `BadgeOpts`, `RingOpts`, `LabelOpts`

## Package Export Notes

`@codegraphy/plugin-api` is currently a type-definition package with `types` exports for:
- `@codegraphy/plugin-api`
- `@codegraphy/plugin-api/events`
- `@codegraphy/plugin-api/plugin`
- `@codegraphy/plugin-api/webview`

Use `import type` for these symbols in plugin code.
