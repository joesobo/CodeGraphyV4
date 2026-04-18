# @codegraphy/extension

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
