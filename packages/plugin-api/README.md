# `@codegraphy/plugin-api`

Type definitions for building CodeGraphy plugins.

- [CodeGraphy VS Code extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [Plugin Guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Plugin lifecycle](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/LIFECYCLE.md)
- [Plugin types](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/TYPES.md)
- [Plugin events](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/EVENTS.md)

## Install

```bash
pnpm add -D @codegraphy/plugin-api
```

## Usage

```ts
import type { IPlugin } from '@codegraphy/plugin-api';
```

This package is type-only. Use `import type` in plugin code.

Main surfaces in the current API:

- per-file analysis objects with symbols, relationships, and Node Type / Edge Type contributions
- default styling via `fileColors`, which already lets a plugin contribute Legend styling for extension matches, exact file names, and glob patterns
- analysis hooks receive an optional `context` with a host-backed file-system adapter so plugins can resolve commit-local files during timeline indexing without reading `fs` directly
- lifecycle hooks for headless analysis: `initialize`, `onWorkspaceReady`, `onPreAnalyze`, `onFilesChanged`, `analyzeFile`, `onPostAnalyze`, `onGraphRebuild`, and `onUnload`

Recommended plugins are headless npm packages. They communicate with `@codegraphy/core`; the VS Code extension owns VS Code UI, commands, webviews, and editor integration.

Extension-owned plugin bridge types such as webview injections, commands, decorations, context menus, and toolbar actions intentionally live in `@codegraphy/extension`, not in this public headless package.

Core runs its own base analysis first. Plugin `analyzeFile(...)` results are then merged additively in the workspace plugin order. Plugins should add more specific evidence instead of deleting or suppressing core baseline relationships.

Current Legend Layer precedence in the host is:

1. core defaults
2. plugin defaults
3. custom user Legend Entries

That means a plugin can contribute default Legend styling for its own files or concepts, and a user can layer custom Legend Entries above built-in defaults through the Legends and Plugins popups.

Exact merge behavior:

- `nodeTypes`, `edgeTypes`, `nodes`, `symbols`: merge by `id`
- `relations`: merge by relationship identity
  - imports/reexports/loads/inherits override by shared source identity
  - distinct call/reference targets coexist

Path and source rules:

- `filePath`, `fromFilePath`, and resolved `toFilePath` values are absolute workspace paths
- unresolved package/runtime targets should use `toFilePath: null`
- `sourceId` in plugin output is plugin-local, like `wikilink` or `import`
- the host qualifies provenance later, for example `codegraphy.markdown:wikilink`

Symbol analysis:

- `symbols` describe declarations discovered in a file. Each symbol should have a stable plugin-local `id`, `name`, `kind`, and absolute `filePath`.
- Optional `range` and `signature` values make navigation, exports, and MCP Graph Query results more precise.
- Symbol metadata can include scalar fields such as `language`, `source`, and `pluginKind`; the host preserves these for Legend scoping, exports, and Graph Query payloads.
- `relations` can point at symbols with `fromSymbolId` and `toSymbolId`. The host projects those endpoints into Symbol Nodes and connects files to symbols with `contains` edges.
- Variable-like symbol kinds such as `variable`, `constant`, and `field` project as Variable Nodes under the Symbols Graph Scope. More specific language kinds project as Symbol Nodes unless a plugin contributes its own Node Type and Legend defaults.

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

The published CodeGraphy plugin packages use the same API surface:

- [`@codegraphy/plugin-typescript`](https://www.npmjs.com/package/@codegraphy/plugin-typescript)
- [`@codegraphy/plugin-python`](https://www.npmjs.com/package/@codegraphy/plugin-python)
- [`@codegraphy/plugin-csharp`](https://www.npmjs.com/package/@codegraphy/plugin-csharp)
- [`@codegraphy/plugin-godot`](https://www.npmjs.com/package/@codegraphy/plugin-godot)
- [`@codegraphy/plugin-markdown`](https://www.npmjs.com/package/@codegraphy/plugin-markdown)
