# Trello 136 Code Connections / Symbol Nodes

## Goal

Implement Trello card [Code connections](https://trello.com/c/Bnoijz2p/136-code-connections) by adding Symbol Nodes to the existing Relationship Graph model.

Code Connections is the product idea. Symbols are the Graph Scope control:

- Symbols are Nodes.
- Symbol/file/code relationships are Edges.
- Graph Scope decides whether Symbol Nodes and their Edge Types are eligible.
- Filter, Search, Depth Mode, Timeline, Export, Legend, theming, and MCP operate on the same Visible Graph pipeline.

## Constraints

- Strict TDD: every behavior slice starts with a failing test before production code.
- No separate rendered symbol graph abstraction.
- No `architecture.md`.
- Work in `codex/code-connections-symbol-nodes`.
- Keep the Trello card in sync as meaningful slices land.
- Commit and push after meaningful green slices.
- Open a draft PR early from the plan commit.

## Existing Seams

- Shared Visible Graph pipeline: `packages/extension/src/shared/visibleGraph/`.
- Graph Scope defaults: `packages/extension/src/shared/graphControls/defaults/`.
- Core Graph Query adapter: `packages/extension/src/core/graphQuery/`.
- MCP adapter: `packages/codegraphy-mcp/src/`.
- Plugin API analysis contract: `packages/plugin-api/src/analysis.ts`.
- Godot analysis path: `packages/plugin-godot/src/analysis.ts`.
- Webview graph controls and context menu: `packages/extension/src/webview/`.
- Export, timeline, churn, and Graph Cache behavior: `packages/extension/src/extension/` and shared contracts.

## Implementation Slices

### 1. Core Symbol Projection

Red tests:

- Symbols default out of the Visible Graph when `Symbols` is off.
- Enabling `Symbols` shows eligible non-variable symbols as normal Nodes.
- Enabling `Variables` adds graph-worthy variable symbols.
- Hidden or excluded files hide their symbols.
- Symbol Nodes can render when file and folder Node Types are off.
- Symbol IDs are repo-relative and cannot collide with file IDs.
- Contains edges point from container to contained and use canonical node IDs.
- Overrides is available as a core Edge Type and follows overriding -> base direction.

Green path:

- Add canonical symbol node contracts and projection helpers.
- Add core `symbol` and `variable` Node Type semantics behind Graph Scope defaults.
- Add core `contains` and `overrides` Edge Type definitions.
- Reuse Graph Scope -> Filter -> Search -> Visible Graph ordering.

### 2. Search, Depth, Sizing, And Churn

Red tests:

- Search matches symbol name, ID, kind, signature, and containing file path.
- Search does not surface symbols when Symbols is off.
- Depth Mode includes symbols through normal edge hops.
- Connections sizing counts Contains edges.
- Churn size can use symbol-range touches when symbol churn data exists.

Green path:

- Extend search matching metadata fields for symbols.
- Keep Depth Mode and sizing generic over Node/Edge data.
- Add symbol churn normalization without a new sizing mode.

### 3. Graph Scope UI

Red tests:

- Symbols defaults off.
- Variables defaults off and is hidden unless Symbols is on.
- Turning Symbols off also turns Variables off.
- Turning Symbols on enables Contains.
- Users can turn Contains off while Symbols remains on.
- Turning Symbols off and on enables Contains again.
- Symbols and Variables persist as workspace Graph Scope settings with the reset rules above.

Green path:

- Add Symbols and Variables controls to the existing Graph Scope panel.
- Keep Variables as a dependent toggle, not a separate first-slice symbol-kind filter.
- Preserve Contains as an Edge Type visible even when Symbols is off.

### 4. Legend, Theming, And Scoped Styling

Red tests:

- Symbol Legend entries exist before matching symbols are visible.
- Initial entries include Function, Method, Class, Interface, Struct, Enum, Namespace, Variable, Constant, Property, and Plugin Symbol.
- Plugin-owned defaults can contribute `Godot class_name`.
- Scoped matching can combine symbol kind/category, file path, plugin source, language, and plugin kind.
- Existing Legend order decides precedence.

Green path:

- Extend Legend entry matching metadata.
- Add symbol defaults using Material Icon Theme-inspired colors/icons where available.
- Reuse existing user Legend ordering and precedence.

### 5. Navigation, Context Menu, And Favorites

Red tests:

- Single-click selects and previews containing file at symbol range.
- Double-click opens containing file persistently at symbol range.
- Right-click selects symbol without opening/previewing.
- Symbol context menu includes Go to Symbol, Reveal File, Favorite/Unfavorite, Copy Symbol ID, and Copy Symbol Name.
- Copy Symbol Name uses the displayed short name.
- Copy Symbol ID uses the canonical repo-relative ID.
- Favorites use canonical symbol IDs and do not override Graph Scope.

Green path:

- Extend graph target classification for symbol nodes.
- Reuse existing file preview/open/reveal/favorite behavior with symbol range metadata.
- Keep first-slice menu actions limited to the Trello card.

### 6. Plugin API And Godot

Red tests:

- Plugin API supports normalized kind plus plugin-specific kind/source metadata.
- Plugin-contributed symbols project through the same graph path as core symbols.
- Godot `class_name` emits a class-like symbol with plugin kind `godot-class-name`.
- Godot plugin contributes a Legend default labeled exactly `Godot class_name`.

Green path:

- Clarify and extend plugin analysis contracts.
- Update Godot `class_name` detection to emit symbols and Contains relationships.
- Document Godot as the reference plugin symbol path.

### 7. Graph Query And MCP

Red tests:

- Graph Query respects Symbols and Variables scope semantics.
- Node, edge, relationship, symbol, and path queries can include symbol nodes.
- Relationship explanation supports file/file, file/symbol, symbol/symbol, and symbol/file paths.
- MCP forwards symbol-inclusive Graph Query requests and responses.

Green path:

- Extend Core Graph Query models and filters.
- Keep MCP as an adapter over Core Extension Graph Query.
- Preserve dedicated symbol listing behavior while aligning with Visible Graph semantics.

### 8. Timeline, Export, And Graph Cache

Red tests:

- Timeline snapshots apply symbol Graph Scope/Search/Depth behavior when snapshot data includes symbols.
- Index Export includes symbol data and symbol-backed relationships.
- Graph Export exports only the current Visible Graph.
- Image Export renders exactly visible symbols.
- Graph Cache versioning safely migrates or reindexes old caches.

Green path:

- Store symbol data in Graph Cache analysis data regardless of current Symbol visibility.
- Re-project existing graph data on Graph Scope changes without re-indexing.
- Bump cache version only if persisted shape changes.

## Quality Plan

Targeted checks during slices:

- `pnpm --filter @codegraphy/extension exec vitest run --config vitest.config.ts <test-file>`
- `pnpm --filter @codegraphy-vscode/plugin-api test`
- `pnpm --filter codegraphy-godot test`
- `pnpm --filter @codegraphy-vscode/mcp test`

Final local gates:

- `pnpm run lint`
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run organize -- .`
- `pnpm run boundaries -- . --strict`
- `pnpm run reachability -- . --strict`
- `pnpm run crap -- .`
- `pnpm run scrap -- .`
- Scoped `pnpm run mutate -- <changed-package-or-src-path>`

PR evidence:

- Summary of implemented behavior.
- Test and quality command output.
- Docs and changeset notes.
- Video demo attached or linked after the UI behavior is complete.

## Progress Log

### 2026-05-11 Slice 1: Core Graph Vocabulary And Projection

- Added hidden-by-default `Symbols` and `Variables` Node Types.
- Added core `contains` and `overrides` Edge Types.
- Added symbol-capable analysis graph projection:
  - canonical repo-relative symbol node IDs
  - file -> symbol `contains` edges
  - symbol-backed relationship edges
  - deterministic duplicate suffixes
  - Variable Node Type classification for variable-like symbol kinds
- Extended shared Visible Graph behavior:
  - Variables cannot surface unless Symbols is enabled
  - file filters hide containing symbols
  - search matches symbol metadata
- Green focused tests:
  - `tests/shared/graphControls/defaults/nodeTypes.test.ts`
  - `tests/shared/graphControls/defaults/edgeTypes.test.ts`
  - `tests/shared/graphControls/defaults/maps.test.ts`
  - `tests/shared/visibleGraph/derive.test.ts`
  - `tests/shared/visibleGraph/search.test.ts`
  - `tests/extension/pipeline/graph/data.test.ts`
  - `tests/extension/pipeline/graph/build.test.ts`
  - `tests/extension/pipeline/serviceAdapters.test.ts`

### 2026-05-11 Slice 2: Graph Scope UI

- Added Graph Scope UI dependency behavior:
  - Variables row is hidden until Symbols is enabled
  - enabling Symbols enables Contains
  - disabling Symbols also disables Variables
- Green focused tests:
  - `tests/webview/graphScope/rows.test.tsx`
  - `tests/extension/graphView/webview/settingsMessages/updates/controls.test.ts`

### 2026-05-11 Slice 3: Navigation, Context Menu, And Favorites

- Symbol node open/reveal targets resolve through containing files at the provider boundary.
- Single-click preview and double-click activation no longer treat canonical symbol IDs as file paths.
- Symbol context menu now uses symbol language:
  - Go to Symbol
  - Reveal File
  - Copy Symbol ID
  - Copy Symbol Name
  - Favorite/Unfavorite with canonical symbol IDs
- Green focused tests:
  - `tests/extension/graphViewProvider.nodeOpenBehavior.test.ts`
  - `tests/webview/graph/contextMenu/node.test.tsx`

### 2026-05-11 Slice 4: Export And Graph Cache

- JSON export now preserves symbol metadata for visible symbol nodes.
- Markdown export renders symbol kind, short name, and containing file.
- Graph Cache version bumped to force a clean reindex for old caches without persisted symbol analysis shape.
- Green focused tests:
  - `tests/webview/export/json/export.test.ts`
  - `tests/webview/export/markdown/nodeEntries.test.ts`
  - `tests/extension/pipeline/cache.test.ts`

### 2026-05-11 Slice 5: Godot class_name Symbols

- `codegraphy.gdscript` now emits `class_name` declarations as class symbols with `pluginKind: godot-class-name`.
- Symbol metadata includes canonical plugin ID/source, GDScript language, signature, file path, and source range.
- Installed Godot integration now proves class-name-backed relationships can target symbol nodes.
- Green focused tests:
  - `packages/plugin-godot/tests/plugin.test.ts`
  - `packages/plugin-godot/tests/activate.test.ts`

### 2026-05-11 Slice 6: Legend And Scoped Theming

- Legend rules can now target symbol nodes by symbol kind, plugin kind, plugin source, language, and containing file path.
- Built-in default groups now include core symbol-kind entries and a scoped `Godot class_name` entry.
- `scripts/**/*.gd`-style glob patterns now match direct files and nested files, which keeps scoped symbol-file rules intuitive.
- Green focused tests:
  - `tests/webview/search/filtering/rules/nodes.test.ts`
  - `tests/extension/graphView/groups/defaults/builtIn.test.ts`
  - `tests/shared/globMatch.test.ts`
- Green typecheck:
  - `pnpm --filter @codegraphy/extension typecheck`

### 2026-05-11 Slice 7: Graph Query And MCP Symbol Payloads

- Graph Query `symbols` reports now include canonical symbol IDs, signatures, and plugin metadata fields.
- Explicit Graph Scope now constrains symbol reports to visible symbol nodes.
- Relationship reports now include canonical identity and plugin metadata on symbol evidence.
- Green focused tests:
  - `tests/core/graphQuery/symbols.test.ts`
  - `tests/core/graphQuery/relationships.test.ts`
- Green typecheck:
  - `pnpm --filter @codegraphy/extension typecheck`

### 2026-05-11 Slice 8: Symbol File Metrics

- Symbol nodes inherit file size and file-level churn from their containing file.
- Optional symbol fields are omitted instead of serialized as `undefined`.
- This keeps file-size/churn sizing and timeline snapshots useful for symbol nodes without inventing per-symbol Git history.
- Green focused tests:
  - `tests/extension/pipeline/graph/data.test.ts`
  - `tests/extension/pipeline/graph/build.test.ts`
- Green typecheck:
  - `pnpm --filter @codegraphy/extension typecheck`
