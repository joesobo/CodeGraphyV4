# `@codegraphy-vscode/plugin-api`

Type definitions for building CodeGraphy plugins.

- [CodeGraphy core extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [Plugin Guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Plugin lifecycle](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/LIFECYCLE.md)
- [Plugin types](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/TYPES.md)
- [Plugin events](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/EVENTS.md)

## Install

```bash
pnpm add -D @codegraphy-vscode/plugin-api
```

## Usage

```ts
import type { CodeGraphyAPI, IPlugin } from '@codegraphy-vscode/plugin-api';
```

This package is type-only. Use `import type` in plugin code.

Main seams in the current API:

- per-file analysis objects with symbols, relations, and node/edge type contributions
- graph queries backed by the projected repo-local index and current graph state: `getGraph`, `getNeighbors`, `getIncomingEdges`, `getOutgoingEdges`, `getSubgraph`, `findPath`
- registrations: `registerCommand`, `registerContextMenuItem`, `registerExporter`, `registerToolbarAction`, and the compatibility `registerView` hook
- host-side export saving: `saveExport`
- graph/webview product surfaces: plugin toolbar buttons, plugin slots, tooltip actions, and optional future-facing view transforms
- default styling via `fileColors`, which already lets a plugin act like a file-theme layer for extension matches, exact file names, and glob patterns
- analysis hooks receive an optional `context` with a host-backed file-system adapter so plugins can resolve commit-local files during timeline indexing without reading `fs` directly

Core runs its own base analysis first. Plugin `analyzeFile(...)` results are then merged on top in plugin order, with higher-priority plugins winning conflicts.

Current legend/style precedence in the host is:

1. core defaults
2. plugin defaults
3. custom user rules

That means a plugin can already behave like a theme pack for file nodes by shipping `fileColors`, and a user can layer that above or below the built-in Material defaults through the Legends and Plugins popups.
Current limitation: the public API does not yet expose a first-class folder-theme contract like the core Material layer, so full file-explorer parity would need an API extension.

Exact merge behavior:

- `nodeTypes`, `edgeTypes`, `nodes`, `symbols`: merge by `id`
- `relations`: merge by relation identity
  - imports/reexports/loads/inherits override by shared source identity
  - distinct call/reference targets coexist

Path and source rules:

- `filePath`, `fromFilePath`, and resolved `toFilePath` values are absolute workspace paths
- unresolved package/runtime targets should use `toFilePath: null`
- `sourceId` in plugin output is plugin-local, like `wikilink` or `import`
- the host qualifies provenance later, for example `codegraphy.markdown:wikilink`

Timeline-safe plugins:

- `analyzeFile(...)`, `onPreAnalyze(...)`, and `onFilesChanged(...)` may receive `context`
- `context.mode` is `'workspace'` or `'timeline'`
- `context.commitSha` is set for timeline replay
- `context.fileSystem` exposes `exists`, `isFile`, `isDirectory`, `listDirectory`, and `readTextFile`
- prefer `context.fileSystem` over raw Node `fs` when plugin behavior depends on repo state, config files, or sibling files

Minimal working plugin object:

```ts
const plugin: IPlugin = {
  id: 'acme.plugin',
  name: 'Acme Plugin',
  version: '1.0.0',
  apiVersion: '^2.0.0',
  supportedExtensions: ['.ts'],
};
```

The published CodeGraphy marketplace plugins use the same API surface:

- [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- [CodeGraphy Python](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python)
- [CodeGraphy C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp)
- [CodeGraphy GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot)
