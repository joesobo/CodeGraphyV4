# @codegraphy-dev/extension

## 5.5.0

### Minor Changes

- [#207](https://github.com/joesobo/CodeGraphyV4/pull/207) [`f54754a`](https://github.com/joesobo/CodeGraphyV4/commit/f54754ac6f974a3e3f88c72690674100615f192f) Thanks [@joesobo](https://github.com/joesobo)! - Add collapsible folder nodes with persisted graph layout state, projected summary edges, context menu actions, and 2D collapse indicators.

- [#203](https://github.com/joesobo/CodeGraphyV4/pull/203) [`9b5dc86`](https://github.com/joesobo/CodeGraphyV4/commit/9b5dc861ab119763856a9f759eb30f136ef1eceb) Thanks [@joesobo](https://github.com/joesobo)! - Add editable Graph Sections for organizing 2D graph nodes with nested ownership, section-local physics, toolbar and context-menu creation, drag-and-drop membership, labels, colors, icons, pinning, collapse/expand behavior, and collapsed-section edge projection.

- [#206](https://github.com/joesobo/CodeGraphyV4/pull/206) [`3409540`](https://github.com/joesobo/CodeGraphyV4/commit/34095407986ae8f28ea4b31fd34a5723cbcc452b) Thanks [@joesobo](https://github.com/joesobo)! - Add desktop-style multi-node selection with left-drag marquee selection, Shift selection extension, right-drag viewport panning, and selected group dragging.

- [#205](https://github.com/joesobo/CodeGraphyV4/pull/205) [`e899c44`](https://github.com/joesobo/CodeGraphyV4/commit/e899c44267c04accd2be6184a9f594b17b34c4f0) Thanks [@joesobo](https://github.com/joesobo)! - Add pinnable graph nodes with persisted graph-space positions, context menu pin controls, and a visible pinned-node badge.

- [#204](https://github.com/joesobo/CodeGraphyV4/pull/204) [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4) Thanks [@joesobo](https://github.com/joesobo)! - Add Symbol and Variable nodes to the Relationship Graph with Graph Scope controls, `contains` and `overrides` edges, scoped Legend defaults, symbol-aware exports, and richer Graph Query/MCP symbol payloads.

  Default node Legend entries now use singular labels, keep their colors directly editable, and rely on Custom Legend Entries for overrides instead of separate color-enable toggles. Core symbol defaults stay intentionally broad; language-specific symbol kinds fall back to Symbol styling unless a plugin contributes its own defaults. The plugin API now documents symbol endpoint projection for `fromSymbolId` and `toSymbolId`, and the Godot plugin emits `class_name`, function, constant, variable, and enum declarations as symbol nodes. Symbol hover cards now show the symbol name, containing file, symbol type, and graph connection counts directly from the visible graph.

### Patch Changes

- [#201](https://github.com/joesobo/CodeGraphyV4/pull/201) [`93728f7`](https://github.com/joesobo/CodeGraphyV4/commit/93728f7eba0fd47f8f9b4122c17bca684c3e9c89) Thanks [@joesobo](https://github.com/joesobo)! - Improve webview theme integration, group the Graph Tool Rail, move scope/export/display controls into their new panels, and make Search filters expand inline with the active VS Code theme.

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Extract CodeGraphy's shared engine into `@codegraphy-dev/core`. Core now owns headless CodeGraphy Workspace indexing, File Discovery, Tree-sitter analysis, plugin execution, Graph Cache reads/writes, workspace freshness status, and Graph Query without depending on VS Code.

  The VS Code extension now acts as the visualization and editor adapter over core, and the public Plugin API is headless: VS Code-specific webview, command, decoration, and host bridge contracts stay inside the extension package.

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Plugins are installed at the user/tool level, discovered through the installed-plugin cache, enabled per CodeGraphy Workspace through the ordered `plugins` array, and configured with workspace-local `options`.

  Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.

- [#201](https://github.com/joesobo/CodeGraphyV4/pull/201) [`ff74a0c`](https://github.com/joesobo/CodeGraphyV4/commit/ff74a0cab72d6d21b20c3a010087cdd98ab916ac) Thanks [@joesobo](https://github.com/joesobo)! - Improve graph viewport spacing, filter controls, light-theme button contrast, display settings layout, theme-driven direction indicators, and transparent folder icon nodes in 2D and 3D graph views.

- Updated dependencies [[`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738)]:
  - @codegraphy-dev/core@0.2.0

## 5.4.0

### Minor Changes

- [#197](https://github.com/joesobo/CodeGraphyV4/pull/197) [`b58c0a1`](https://github.com/joesobo/CodeGraphyV4/commit/b58c0a18bca1899f10e17bd86f2ba509bc63ea54) Thanks [@joesobo](https://github.com/joesobo)! - Add New Folder to folder node and graph background context menus, show newly created empty folders in the graph, and refresh the graph after folders are deleted from the VS Code Explorer.

- [#199](https://github.com/joesobo/CodeGraphyV4/pull/199) [`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1) Thanks [@joesobo](https://github.com/joesobo)! - Replace editor-visit access-count sizing with Git history churn sizing. Size by Churn appears after Git history is indexed, graph exports include churn, and graph node metadata no longer exposes accessCount.

### Patch Changes

- [#199](https://github.com/joesobo/CodeGraphyV4/pull/199) [`c77d1ef`](https://github.com/joesobo/CodeGraphyV4/commit/c77d1ef87c8aa557488ff6554936484eef483d62) Thanks [@joesobo](https://github.com/joesobo)! - Remount the 3D graph surface when viewport dimensions recover, preventing blank WebGL after temporary zero-size layouts.

- [#197](https://github.com/joesobo/CodeGraphyV4/pull/197) [`e04d5ea`](https://github.com/joesobo/CodeGraphyV4/commit/e04d5eac69bce8bdf5ab70d81027dd240e676050) Thanks [@joesobo](https://github.com/joesobo)! - Add folder rename/delete actions, edge endpoint open actions, and clearer filter versus legend labels to the Graph Context Menu.

- [#199](https://github.com/joesobo/CodeGraphyV4/pull/199) [`8baa285`](https://github.com/joesobo/CodeGraphyV4/commit/8baa285f4bfbca42028267ad06d2873cf9e511bf) Thanks [@joesobo](https://github.com/joesobo)! - Keep Graph Context Menu mutation actions visible but disabled when viewing historical Timeline Snapshots.

## 5.3.1

### Patch Changes

- [#195](https://github.com/joesobo/CodeGraphyV4/pull/195) [`abdc884`](https://github.com/joesobo/CodeGraphyV4/commit/abdc884d1e75b9072a67e57625e9d1487b8c2056) Thanks [@joesobo](https://github.com/joesobo)! - Ignore Turbo cache churn during graph refresh and show CLI indexing wait feedback.

## 5.3.0

### Minor Changes

- [#185](https://github.com/joesobo/CodeGraphyV4/pull/185) [`d64701d`](https://github.com/joesobo/CodeGraphyV4/commit/d64701df5eefa3922651480b54417cf2cc9e5d90) Thanks [@joesobo](https://github.com/joesobo)! - Add the CodeGraphy MCP package and agent workflow for querying the Relationship Graph from Codex and other MCP-capable agents.

  At the time, the extension exposed Graph Query for agent use, including node, edge, relationship, symbol, and path reports. That design asked VS Code to open or focus the repo before indexing/querying; newer releases run MCP and CLI indexing/querying through `@codegraphy-dev/core` without opening or focusing VS Code.

- [#188](https://github.com/joesobo/CodeGraphyV4/pull/188) [`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f) Thanks [@joesobo](https://github.com/joesobo)! - Apply graph scope, structural projection, filters, search, and orphan visibility through one shared visible graph derivation pipeline.

  Core structural nesting edges now use the `nests` edge kind. Namespaced edge kinds remain reserved for plugin-owned relationships.

- [#192](https://github.com/joesobo/CodeGraphyV4/pull/192) [`2c76df7`](https://github.com/joesobo/CodeGraphyV4/commit/2c76df70bacf129622dd6a2c5349315ed4258bab) Thanks [@joesobo](https://github.com/joesobo)! - Add core Tree-sitter support for C, C++, Dart, Haskell, Kotlin, Lua, PHP, Ruby, and Swift relationships and symbols.

### Patch Changes

- [#184](https://github.com/joesobo/CodeGraphyV4/pull/184) [`10dacdb`](https://github.com/joesobo/CodeGraphyV4/commit/10dacdb2e33efeba9293d234bc46dd86c82e5ade) Thanks [@joesobo](https://github.com/joesobo)! - Increase the default `maxFiles` setting from 500 to 1000.

- [#191](https://github.com/joesobo/CodeGraphyV4/pull/191) [`b0408d5`](https://github.com/joesobo/CodeGraphyV4/commit/b0408d5222b4c81a387abae91c70ec59e513ee77) Thanks [@joesobo](https://github.com/joesobo)! - Fix Graph View zoom controls in 3D mode and allow holding the zoom buttons to continuously zoom.

## 5.2.1

### Patch Changes

- [#182](https://github.com/joesobo/CodeGraphyV4/pull/182) [`f7ff114`](https://github.com/joesobo/CodeGraphyV4/commit/f7ff114782e122a78b2f3ae6772370f06aacc659) Thanks [@joesobo](https://github.com/joesobo)! - Fix timeline history playback so commit graphs stop pulling in unsupported files from old diffs, resolve plugin file lookups against each commit instead of the current workspace, refresh Material legend groups when you jump between commits, and allow third-party plugins to contribute timeline edges from commit-local state. Timeline commits with no graphable files now show a commit-specific empty state instead of the generic “open a folder” message.

## 5.2.0

### Minor Changes

- [#181](https://github.com/joesobo/CodeGraphyV4/pull/181) [`a3c16f3`](https://github.com/joesobo/CodeGraphyV4/commit/a3c16f3a0440d513f1098fb46175402a6070ab91) Thanks [@joesobo](https://github.com/joesobo)! - Show language icons in graph nodes, add Material-style built-in node theming in the core extension, and expose color, icon, and shape controls in custom legend rules.

- [#180](https://github.com/joesobo/CodeGraphyV4/pull/180) [`b95cec9`](https://github.com/joesobo/CodeGraphyV4/commit/b95cec92232fb989a528f491d06779a2ac387ea9) Thanks [@joesobo](https://github.com/joesobo)! - Move graph filters into the search bar with source toggles, counts, and context-menu prefill.

### Patch Changes

- [#181](https://github.com/joesobo/CodeGraphyV4/pull/181) [`b4fd243`](https://github.com/joesobo/CodeGraphyV4/commit/b4fd2433b892b0d1d353a8d2d6c9d004ed87aa44) Thanks [@joesobo](https://github.com/joesobo)! - Fix legend visibility toggles so Material Icon Theme and plugin groups persist reliably, support transparent legend colors, and remember collapsed legend sections between sessions.

- [#177](https://github.com/joesobo/CodeGraphyV4/pull/177) [`16d7460`](https://github.com/joesobo/CodeGraphyV4/commit/16d7460763abc4230d1504ae916c89a4423a3fa1) Thanks [@joesobo](https://github.com/joesobo)! - Clean up repo-local settings by dropping unused plugin and edge color fields while resolving edge colors through legend rules.

## 5.1.0

### Minor Changes

- [#176](https://github.com/joesobo/CodeGraphyV4/pull/176) [`bae8657`](https://github.com/joesobo/CodeGraphyV4/commit/bae86577832441943b8cc83130617d1f79c0dc83) Thanks [@joesobo](https://github.com/joesobo)! - Add optional Type imports graph edges for TypeScript type-only imports.

## 5.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20) Thanks [@joesobo](https://github.com/joesobo)! - Remove the legacy `detectConnections(...)` plugin hook and require plugin-contributed analysis to use `analyzeFile(...)` with the shared per-file analysis result shape.

- [#173](https://github.com/joesobo/CodeGraphyV4/pull/173) [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c) Thanks [@joesobo](https://github.com/joesobo)! - Broaden the plugin graph API with shared per-file analysis results, canonical `kind`/`sources` graph contracts, repo-backed graph queries, toolbar action registration, named graph slots, tooltip actions, and scoped custom-view recompute dependencies.

### Minor Changes

- [#168](https://github.com/joesobo/CodeGraphyV4/pull/168) [`c518c4c`](https://github.com/joesobo/CodeGraphyV4/commit/c518c4ccbcbe2bc40b0824fc56c4f9c2d4f24c8b) Thanks [@joesobo](https://github.com/joesobo)! - Show the currently open file as a breadcrumb above the graph and keep it in sync with editor changes.

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`6178a4e`](https://github.com/joesobo/CodeGraphyV4/commit/6178a4ed7127c7e00ff760a43bd68c81f0006fd7) Thanks [@joesobo](https://github.com/joesobo)! - Improve graph filtering with inline filter edits and quick-add prompts from the node context menu.

  Change markdown wikilinks to resolve by workspace-root-relative paths like `[[notes/Guide.md]]` instead of bare note names.

- [#172](https://github.com/joesobo/CodeGraphyV4/pull/172) [`0d38268`](https://github.com/joesobo/CodeGraphyV4/commit/0d38268ee217469e008f581d92bb94fc1689aeee) Thanks [@joesobo](https://github.com/joesobo)! - Reintroduce depth mode on the unified graph surface, with a local graph around the active file and a bottom-mounted depth slider.

- [#167](https://github.com/joesobo/CodeGraphyV4/pull/167) [`0894832`](https://github.com/joesobo/CodeGraphyV4/commit/0894832bb203ac5ec75e1d390b526f0e7b2b6cf9) Thanks [@joesobo](https://github.com/joesobo)! - Add a collapsible graph toolbar section so the main graph controls can be tucked away in narrow sidebars without hiding refresh, plugin, or settings actions.

### Patch Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`0334085`](https://github.com/joesobo/CodeGraphyV4/commit/03340858e4365b953053b44493172cddb635fbf9) Thanks [@joesobo](https://github.com/joesobo)! - Fix nested example workspace indexing so Python, Go, Java, Rust, and Godot file connections resolve when opening the repo-level `examples` folder.

- [#173](https://github.com/joesobo/CodeGraphyV4/pull/173) [`02944c3`](https://github.com/joesobo/CodeGraphyV4/commit/02944c3174ea3d9a20067d19e916cceb0c9e599f) Thanks [@joesobo](https://github.com/joesobo)! - Fix focused TypeScript plugin views not appearing in the graph toolbar after plugin registration.

  Improve 3D graph startup reliability so toggling into 3D no longer trips a startup race in the live VS Code extension.

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`42d92ca`](https://github.com/joesobo/CodeGraphyV4/commit/42d92ca6513611d34cc9b6be9ee42cb3d7823ea7) Thanks [@joesobo](https://github.com/joesobo)! - Fix symbol JSON exports to use normalized file paths and correct per-file symbol and relation counts, and fail fast when mutation testing is pointed at the whole repo instead of a package-scoped target.

- [#169](https://github.com/joesobo/CodeGraphyV4/pull/169) [`4239636`](https://github.com/joesobo/CodeGraphyV4/commit/42396369eccc92c98d2fc686dbc0a7c19d63eb2f) Thanks [@joesobo](https://github.com/joesobo)! - Restore cached timeline history and the latest cached commit graph when reopening a repository, so timeline playback is available without reindexing every session.

## 4.1.2

### Patch Changes

- [#165](https://github.com/joesobo/CodeGraphyV4/pull/165) [`e857a22`](https://github.com/joesobo/CodeGraphyV4/commit/e857a22622c8998217552ed96cdc309f9b264f82) Thanks [@joesobo](https://github.com/joesobo)! - Load installed CodeGraphy plugins before the first graph analysis so external plugins, sources, and timeline connections are available as soon as the sidebar opens.

## 4.1.1

### Patch Changes

- [#164](https://github.com/joesobo/CodeGraphyV4/pull/164) [`24bef90`](https://github.com/joesobo/CodeGraphyV4/commit/24bef90cdc5fb8a4b70254c0fa8b4423e7fc4545) Thanks [@joesobo](https://github.com/joesobo)! - Fix the published core extension package so the Graph and Timeline sidebar views ship the latest bundled UI instead of stale build output.

## 4.1.0

### Minor Changes

- [#161](https://github.com/joesobo/CodeGraphyV4/pull/161) [`83e6eaf`](https://github.com/joesobo/CodeGraphyV4/commit/83e6eafd80da1e38ddf1025f485ee2214072e395) Thanks [@joesobo](https://github.com/joesobo)! - Split the CodeGraphy sidebar into separate Graph and Timeline views, move the graph controls into a vertical toolbar so they stay usable in narrow sidebars, keep both views stable when the sidebar is collapsed or expanded, and turn the Timeline view into a richer playback panel with current commit details, transport controls, and a compact commit list.

### Patch Changes

- [#163](https://github.com/joesobo/CodeGraphyV4/pull/163) [`641db10`](https://github.com/joesobo/CodeGraphyV4/commit/641db106f062c014b95a86daf3a1fbf20931648c) Thanks [@joesobo](https://github.com/joesobo)! - Fix custom group editing in the sidebar so new groups, toggles, and edits update immediately instead of lagging behind VS Code settings.

## 4.0.2

### Patch Changes

- [#158](https://github.com/joesobo/CodeGraphyV4/pull/158) [`f17e398`](https://github.com/joesobo/CodeGraphyV4/commit/f17e398ddc85e73618cf6f82b0601c09d36b0535) Thanks [@joesobo](https://github.com/joesobo)! - Fix extra graph refreshes while editing custom groups in the settings panel.

- [#160](https://github.com/joesobo/CodeGraphyV4/pull/160) [`b28173f`](https://github.com/joesobo/CodeGraphyV4/commit/b28173fa310097d43e33f94e5a5fc2354217b649) Thanks [@joesobo](https://github.com/joesobo)! - Keep CodeGraphy settings, favorites, and custom groups in sync between VS Code settings and the sidebar UI.

- [#157](https://github.com/joesobo/CodeGraphyV4/pull/157) [`6065f4c`](https://github.com/joesobo/CodeGraphyV4/commit/6065f4c6a1e9d4be385e8cd1849f58ea307ff55a) Thanks [@joesobo](https://github.com/joesobo)! - Fix custom group glob patterns so nested folders like `DIR_NAME/*` and `DIR_NAME/**` are matched correctly.

- [#155](https://github.com/joesobo/CodeGraphyV4/pull/155) [`0fb7950`](https://github.com/joesobo/CodeGraphyV4/commit/0fb7950381c25001cedc822e10e0220683a59ba0) Thanks [@joesobo](https://github.com/joesobo)! - Keep custom group edits in sync between the sidebar and VS Code settings, including debounced updates from `codegraphy.groups`, and fix the activity bar manifest icon so the extension loads cleanly.

- [#156](https://github.com/joesobo/CodeGraphyV4/pull/156) [`dd936e8`](https://github.com/joesobo/CodeGraphyV4/commit/dd936e8916347dd1eaaebee5802e5d74d3652e02) Thanks [@joesobo](https://github.com/joesobo)! - Reduce random and duplicate graph refreshes caused by overlapping watcher, ready, group, and decoration update events.

- [#159](https://github.com/joesobo/CodeGraphyV4/pull/159) [`149d81c`](https://github.com/joesobo/CodeGraphyV4/commit/149d81c6499812c8cce14ad429860dbbff40654f) Thanks [@joesobo](https://github.com/joesobo)! - Keep CodeGraphy sidebar settings in sync with VS Code settings changes, including reopening the view after settings change while hidden, and apply updated graph settings before the next refresh.

- [#156](https://github.com/joesobo/CodeGraphyV4/pull/156) [`55146be`](https://github.com/joesobo/CodeGraphyV4/commit/55146be226c3b663eedab6249f9d08a348d339e0) Thanks [@joesobo](https://github.com/joesobo)! - Prevent duplicate graph refreshes caused by repeated webview startup handshakes.
