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
  IGraphNode,
  IGraphEdge,
  IGraphData,
  Disposable,
} from '@codegraphy/plugin-api';
```

The public package is headless. Extension-owned bridge types for webviews, commands, decorations, toolbar actions, and graph-view injections live in `@codegraphy/extension`.

## Core Plugin Contract

### `IPlugin`

Defined in `plugin.ts`.

Key points:
- `apiVersion: string` is required (for example `'^2.0.0'`).
- `sources?: IConnectionSource[]` declares the plugin's Relationship Source families.
- `fileColors?: Record<string, string | IPluginFileColorDefinition>` lets plugins provide default color/shape/imagePath styling by pattern.
- `analyzeFile(filePath, content, workspaceRoot, context?)` is the plugin analysis hook for returning relationships, symbols, and contributed Node Types or Edge Types.
- core builds the base file result first, then plugin results are merged on top in plugin order.
- `contributeNodeTypes()` and `contributeEdgeTypes()` let plugins register new Node Types, Edge Types, and defaults.
- Optional hooks: `initialize`, `onWorkspaceReady`, `onPreAnalyze`, `onFilesChanged`, `onPostAnalyze`, `onGraphRebuild`, `onUnload`.

### `IPluginAnalysisContext`

- `mode: 'workspace' | 'timeline'`
- `commitSha?: string` is present during timeline replay
- `fileSystem` is a host-backed adapter with:
  - `exists(filePath)`
  - `isFile(filePath)`
  - `isDirectory(filePath)`
  - `listDirectory(filePath)`
  - `readTextFile(filePath)`

Use this instead of raw Node `fs` when your plugin needs sibling files, config files, or repo-local state. During timeline indexing the adapter reads the selected commit, not `HEAD`.

### Merge Rules

Higher-priority plugins only override data when both sides hit the same merge key.

- `nodeTypes`, `edgeTypes`, `nodes`, and `symbols` merge by `id`
- `relations` merge by relationship identity

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

## Extension-Owned Surfaces

The public npm Plugin API does not expose `CodeGraphyAPI`, webview contracts, decorations, commands, context menus, exporters, toolbar actions, or plugin-defined graph views. Those contracts are extension-owned and remain inside `packages/extension` because they are visualization and VS Code integration surfaces.

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
- `IPluginFileColorDefinition` with `color`, optional `shape2D`, optional `shape3D`, and optional `imagePath`

`connection.ts` is now only about source metadata: the relationship families a plugin declares in `sources` so the host can preserve Relationship Source provenance in graph edges, inspectors, and exports.

The public plugin API no longer exposes the old `IConnection` / `IConnectionDetector` analysis types. Plugins return `IFileAnalysisResult` objects from `analyzeFile(...)`, with relationships expressed through the `relations` field and `IAnalysisRelation` type.

`sourceId` is plugin-local. Use ids like `wikilink`, `import`, `preload`, or `call`.

- plugin output: `sourceId: 'wikilink'`
- merged graph provenance later: `id: 'codegraphy.markdown:wikilink'`

If you see projected file-to-file edges inside the extension codebase, those are extension-internal compatibility shapes used by the current graph/timeline pipeline. They are not part of the public plugin API.

### Graph (`graph.ts`)

- `NodeType` = core `file | folder | package` plus plugin-defined string Node Types
- `IGraphNode` (id/label/color + optional position/favorite/size/access/depth fields)
- `IGraphEdge` (`id`, `from`, `to`, `kind`, `sources[]`)
- `IGraphEdgeSource` (`id`, `pluginId`, `sourceId`, `label`, optional `variant`, optional scalar `metadata`)
- `IGraphData` (`nodes`, `edges`)
- `GraphEdgeKind` = reserved core kinds plus namespaced custom kinds (`pluginId:kind`)
- External Package nodes let plugins and host views include unresolved external imports like `fs` or `react` without pretending they are workspace files.

## Theme-Style Plugins

The current public API already supports a file-theme style plugin through `fileColors`:

- extension matches like `.ts`
- exact file names like `package.json`
- glob patterns like `**/*.stories.tsx`
- optional `shape2D`, `shape3D`, and `imagePath`

Those plugin defaults sit above core defaults and below custom Legend Entries, so a user can treat them like an installable theme layer for File Nodes. In the current UI that means Material Icon Theme stays in the core layer, plugin defaults are grouped separately, and custom entries still win last.

Current limitation: folder icon theming is still core-only. The API does not yet expose a folder-name or folder-icon contract comparable to the built-in Material Icon Theme integration.

## Package Export Notes

`@codegraphy/plugin-api` is currently a type-definition package with `types` exports for:
- `@codegraphy/plugin-api`
- `@codegraphy/plugin-api/events`
- `@codegraphy/plugin-api/plugin`

Use `import type` for these symbols in plugin code.
