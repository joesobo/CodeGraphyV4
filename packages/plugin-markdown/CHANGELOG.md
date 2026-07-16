# @codegraphy-dev/plugin-markdown

## 1.1.9

### Patch Changes

- Declare compatibility with the new CodeGraphy Plugin API 3 runtime contract.

- Updated dependencies [[`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974), [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e)]:
  - @codegraphy-dev/plugin-api@6.0.0

## 1.1.8

### Patch Changes

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now keeps plugin-owned evidence and symbol evidence out of runtime memory until the user enables the matching Graph Scope or plugin. If the evidence is already in Graph Cache, the first toggle hydrates it with 1 cache read, 0 analysis jobs, and 0 cache saves; later off/on toggles reuse memory with 0 additional cache reads.

  On the current `main` versus PR CodeGraphy monorepo benchmark, baseline runtime cache size improved from 18,583,676 serialized bytes to 10,781,465 serialized bytes: 7,802,211 bytes less, a 41.98% reduction, and 1.72x smaller. Retained symbol facts stay at 0 until Symbol scope is enabled instead of retaining 11,631 hidden symbol facts on startup.

  Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

- Updated dependencies [[`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/plugin-api@5.3.0

## 1.1.7

### Patch Changes

- Updated dependencies [[`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6), [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc)]:
  - @codegraphy-dev/plugin-api@5.2.0

## 1.1.6

### Patch Changes

- [#270](https://github.com/joesobo/CodeGraphyV4/pull/270) [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b) Thanks [@joesobo](https://github.com/joesobo)! - Allow current and future Node releases while keeping Node 20 as the minimum supported runtime.

- Updated dependencies [[`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472), [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096), [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b), [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136), [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f)]:
  - @codegraphy-dev/plugin-api@5.1.0

## 1.1.5

### Patch Changes

- [#259](https://github.com/joesobo/CodeGraphyV4/pull/259) [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12) Thanks [@joesobo](https://github.com/joesobo)! - Declare Graph Scope capabilities from first-party plugins.

  First-party plugins now use `contributeGraphScopeCapabilities(context)` so Graph Scope can show relevant plugin-owned and core controls before the current graph has matching nodes or edges.

- Updated dependencies [[`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12)]:
  - @codegraphy-dev/plugin-api@5.0.0

## 1.1.4

### Patch Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886) Thanks [@joesobo](https://github.com/joesobo)! - Graph Scope now shows Edge Type controls from indexed workspace capabilities instead of every theoretical toggle or only currently observed edges. Relevant Edge Types can appear even when the latest graph has zero matching relationships, and CodeGraphy decides the relevant Edge Type list before Depth Mode, filters, search, or other view narrowing changes what is displayed. Edge Type controls stay visible but disabled until the workspace has a Graph Cache, and Graph Scope returns to Node Types if an unindexed workspace is opened while Edge Types was selected. Any existing Graph Cache enables Edge Type controls, even while Graph Cache Sync catches up.

  Source-language workspaces now surface Calls as a relevant Edge Type when their analyzer can emit imported-call relationships. C++ now emits Calls edges for calls to declarations in included headers, and the Godot plugin now emits Calls edges for `class_name` static method calls while keeping `load()` and `preload()` on the Loads edge.

  Plugins can declare core or plugin-owned Edge Type capabilities with `contributeEdgeTypeCapabilities(context)`. Plugin authors should use `context.filePaths` when a plugin supports multiple languages or file families with different Edge Types, so Graph Scope only shows toggles that are relevant to the indexed workspace.

- [#246](https://github.com/joesobo/CodeGraphyV4/pull/246) [`b1be863`](https://github.com/joesobo/CodeGraphyV4/commit/b1be8636176b990e878b17e1aad751877568e5d5) Thanks [@joesobo](https://github.com/joesobo)! - Resolve Markdown example reference links when the example folder is opened as the workspace root.

- Updated dependencies [[`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886), [`1d9180c`](https://github.com/joesobo/CodeGraphyV4/commit/1d9180c29554c163e660a7c899c59755c4b0bdff), [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561)]:
  - @codegraphy-dev/plugin-api@4.0.0

## 1.1.3

### Patch Changes

- Updated dependencies [[`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c)]:
  - @codegraphy-dev/plugin-api@3.1.2

## 1.1.2

### Patch Changes

- [#220](https://github.com/joesobo/CodeGraphyV4/pull/220) [`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5) Thanks [@joesobo](https://github.com/joesobo)! - Allow current Node 20 releases without workspace engine warnings.

- Updated dependencies [[`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5)]:
  - @codegraphy-dev/plugin-api@3.1.1

## 1.1.1

### Patch Changes

- Updated dependencies [[`582c514`](https://github.com/joesobo/CodeGraphyV4/commit/582c5140a3ffee19df917ce6f0796fd0f80d53e0), [`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b), [`2b15c9c`](https://github.com/joesobo/CodeGraphyV4/commit/2b15c9c61c4d954554a4b979540b89a8ef595061), [`8b559dd`](https://github.com/joesobo/CodeGraphyV4/commit/8b559dd3204b87808dd1834fd2c00277d7f06d62), [`4e4a1ac`](https://github.com/joesobo/CodeGraphyV4/commit/4e4a1ac9187d9b6feaaa91437293b2fab8120cc2), [`005e4f5`](https://github.com/joesobo/CodeGraphyV4/commit/005e4f522b6295f6fbf068c79571f9182e963172), [`c7a6ffc`](https://github.com/joesobo/CodeGraphyV4/commit/c7a6ffc1d271f1342139e0d7b79e6accb20cec7e), [`07ff638`](https://github.com/joesobo/CodeGraphyV4/commit/07ff638cdc127a455f5606c6205e78b2ac0d3761), [`a5f6df8`](https://github.com/joesobo/CodeGraphyV4/commit/a5f6df8b8ad5e89fddb43aaa77e0fc80e732f521), [`2a8751c`](https://github.com/joesobo/CodeGraphyV4/commit/2a8751c14492b23e292c28af8646e64b4251ee83), [`d11c799`](https://github.com/joesobo/CodeGraphyV4/commit/d11c799e29f547543184aed14487b6c7d6476326), [`265728a`](https://github.com/joesobo/CodeGraphyV4/commit/265728adb88828772fc9e8b8745aefc36bc55a08)]:
  - @codegraphy-dev/plugin-api@3.1.0

## 1.1.0

### Minor Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Extract CodeGraphy's shared engine into `@codegraphy-dev/core`. Core now owns headless CodeGraphy Workspace indexing, File Discovery, Tree-sitter analysis, plugin execution, Graph Cache reads/writes, workspace freshness status, and Graph Query without depending on VS Code.

  The VS Code extension now acts as the visualization and editor adapter over core, and the public Plugin API is headless: VS Code-specific webview, command, decoration, and host bridge contracts stay inside the extension package.

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Plugins are installed at the user/tool level, discovered through the installed-plugin cache, enabled per CodeGraphy Workspace through the ordered `plugins` array, and configured with workspace-local `options`.

  Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.

### Patch Changes

- Updated dependencies [[`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4)]:
  - @codegraphy-dev/plugin-api@3.0.0

## 1.0.4

### Patch Changes

- Updated dependencies [[`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1)]:
  - @codegraphy-dev/plugin-api@2.0.0

## 1.0.3

### Patch Changes

- Updated dependencies [[`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f)]:
  - @codegraphy-dev/plugin-api@1.2.0

## 1.0.2

### Patch Changes

- [#181](https://github.com/joesobo/CodeGraphyV4/pull/181) [`a3c16f3`](https://github.com/joesobo/CodeGraphyV4/commit/a3c16f3a0440d513f1098fb46175402a6070ab91) Thanks [@joesobo](https://github.com/joesobo)! - Show language icons in graph nodes, add Material-style built-in node theming in the core extension, and expose color, icon, and shape controls in custom legend rules.

## 1.0.1

### Patch Changes

- Updated dependencies [[`bae8657`](https://github.com/joesobo/CodeGraphyV4/commit/bae86577832441943b8cc83130617d1f79c0dc83)]:
  - @codegraphy-dev/plugin-api@1.1.0

## 1.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`6178a4e`](https://github.com/joesobo/CodeGraphyV4/commit/6178a4ed7127c7e00ff760a43bd68c81f0006fd7) Thanks [@joesobo](https://github.com/joesobo)! - Improve graph filtering with inline filter edits and quick-add prompts from the node context menu.

  Change markdown wikilinks to resolve by workspace-root-relative paths like `[[notes/Guide.md]]` instead of bare note names.

### Patch Changes

- Updated dependencies [[`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955), [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20), [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c)]:
  - @codegraphy-dev/plugin-api@1.0.0

## 0.1.1

### Patch Changes

- Updated dependencies []:
  - @codegraphy-dev/plugin-api@0.1.1
