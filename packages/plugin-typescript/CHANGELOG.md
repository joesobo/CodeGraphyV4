# @codegraphy-dev/plugin-typescript

## 2.2.7

### Patch Changes

- [#312](https://github.com/joesobo/CodeGraphyV4/pull/312) [`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962) Thanks [@joesobo](https://github.com/joesobo)! - Make repeated workspace Indexing reuse unchanged file analysis while giving plugins the changed files and lightweight workspace inventory needed for safe invalidation.

- Updated dependencies [[`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962)]:
  - @codegraphy-dev/plugin-api@6.1.0

## 2.2.6

### Patch Changes

- Declare compatibility with the new CodeGraphy Plugin API 3 runtime contract.

- Updated dependencies [[`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974), [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e)]:
  - @codegraphy-dev/plugin-api@6.0.0

## 2.2.5

### Patch Changes

- [#294](https://github.com/joesobo/CodeGraphyV4/pull/294) [`e950612`](https://github.com/joesobo/CodeGraphyV4/commit/e95061239ab63fc3c5e64ec8b653db7466271979) Thanks [@joesobo](https://github.com/joesobo)! - TypeScript alias import analysis now reads `tsconfig` compiler options without enumerating every project file, and it reuses parsed alias configuration until the config changes. On the CodeGraphy monorepo benchmark, this moved cold indexing from 37.27s to 17.28s: 19.99s faster, a 53.64% reduction, and 2.16x faster. File analysis improved from 23,352ms to 3,697ms: 19,655ms faster, an 84.17% reduction, and 6.32x faster.

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now loads plugin-owned and Symbol evidence into memory when the user enables the matching Graph Scope or plugin. If Graph Cache contains the evidence, the first toggle uses 1 cache read, 0 analysis jobs, and 0 cache saves. Later off/on toggles reuse memory without more cache reads.

In the current `main` versus PR monorepo benchmark, the change reduced baseline serialized runtime cache size from 18,583,676 bytes to 10,781,465 bytes. The result uses 7,802,211 fewer bytes, a 41.98% reduction, and is 1.72 times smaller. It also keeps retained Symbol facts at 0 until the user enables Symbol scope; the previous startup retained 11,631 hidden facts.

Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

- Updated dependencies [[`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/plugin-api@5.3.0

## 2.2.4

### Patch Changes

- Updated dependencies [[`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6), [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc)]:
  - @codegraphy-dev/plugin-api@5.2.0

## 2.2.3

### Patch Changes

- [#270](https://github.com/joesobo/CodeGraphyV4/pull/270) [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b) Thanks [@joesobo](https://github.com/joesobo)! - Allow current and future Node releases while keeping Node 20 as the minimum supported runtime.

- Updated dependencies [[`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472), [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096), [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b), [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136), [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f)]:
  - @codegraphy-dev/plugin-api@5.1.0

## 2.2.2

### Patch Changes

- [#259](https://github.com/joesobo/CodeGraphyV4/pull/259) [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12) Thanks [@joesobo](https://github.com/joesobo)! - Declare Graph Scope capabilities from first-party plugins.

First-party plugins now use `contributeGraphScopeCapabilities(context)` so Graph Scope can show relevant plugin-owned and core controls before the current graph has matching nodes or edges.

- Updated dependencies [[`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12)]:
  - @codegraphy-dev/plugin-api@5.0.0

## 2.2.1

### Patch Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886) Thanks [@joesobo](https://github.com/joesobo)! - Graph Scope now derives Edge Type controls from indexed workspace capabilities. Relevant Edge Types can appear when the graph has no matching Relationships. CodeGraphy derives the list before Depth Mode, filters, search, or other view rules narrow the display. Controls remain visible but disabled until the workspace has a Graph Cache. Graph Scope returns to Node Types when a user opens an unindexed workspace with Edge Types selected. Any Graph Cache enables the controls while Graph Cache Sync updates it.

Source-language workspaces now surface Calls as a relevant Edge Type when their analyzer can emit imported-call relationships. C++ now emits Calls edges for calls to declarations in included headers, and the Godot plugin now emits Calls edges for `class_name` static method calls while keeping `load()` and `preload()` on the Loads edge.

Plugins can declare core or plugin-owned Edge Type capabilities with `contributeEdgeTypeCapabilities(context)`. Plugin authors should use `context.filePaths` when a plugin supports multiple languages or file families with different Edge Types, so Graph Scope only shows toggles that are relevant to the indexed workspace.

- [#251](https://github.com/joesobo/CodeGraphyV4/pull/251) [`cde9534`](https://github.com/joesobo/CodeGraphyV4/commit/cde95347151834d6241394ac3eef61d103734a75) Thanks [@joesobo](https://github.com/joesobo)! - Add Graph Scope tooltip copy and an example for TypeScript Alias Import edges.

- Updated dependencies [[`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886), [`1d9180c`](https://github.com/joesobo/CodeGraphyV4/commit/1d9180c29554c163e660a7c899c59755c4b0bdff), [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561)]:
  - @codegraphy-dev/plugin-api@4.0.0

## 2.2.0

### Minor Changes

- [#225](https://github.com/joesobo/CodeGraphyV4/pull/225) [`4594cdc`](https://github.com/joesobo/CodeGraphyV4/commit/4594cdc097b6fafabc014411f01ef0a12ee725d6) Thanks [@joesobo](https://github.com/joesobo)! - Add TypeScript Alias Import relationships from `compilerOptions.paths` so alias-based imports appear as a separate, toggleable edge type in CodeGraphy.

### Patch Changes

- Updated dependencies [[`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c)]:
  - @codegraphy-dev/plugin-api@3.1.2

## 2.1.2

### Patch Changes

- [#220](https://github.com/joesobo/CodeGraphyV4/pull/220) [`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5) Thanks [@joesobo](https://github.com/joesobo)! - Allow current Node 20 releases without workspace engine warnings.

- Updated dependencies [[`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5)]:
  - @codegraphy-dev/plugin-api@3.1.1

## 2.1.1

### Patch Changes

- Updated dependencies [[`582c514`](https://github.com/joesobo/CodeGraphyV4/commit/582c5140a3ffee19df917ce6f0796fd0f80d53e0), [`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b), [`2b15c9c`](https://github.com/joesobo/CodeGraphyV4/commit/2b15c9c61c4d954554a4b979540b89a8ef595061), [`8b559dd`](https://github.com/joesobo/CodeGraphyV4/commit/8b559dd3204b87808dd1834fd2c00277d7f06d62), [`4e4a1ac`](https://github.com/joesobo/CodeGraphyV4/commit/4e4a1ac9187d9b6feaaa91437293b2fab8120cc2), [`005e4f5`](https://github.com/joesobo/CodeGraphyV4/commit/005e4f522b6295f6fbf068c79571f9182e963172), [`c7a6ffc`](https://github.com/joesobo/CodeGraphyV4/commit/c7a6ffc1d271f1342139e0d7b79e6accb20cec7e), [`07ff638`](https://github.com/joesobo/CodeGraphyV4/commit/07ff638cdc127a455f5606c6205e78b2ac0d3761), [`a5f6df8`](https://github.com/joesobo/CodeGraphyV4/commit/a5f6df8b8ad5e89fddb43aaa77e0fc80e732f521), [`2a8751c`](https://github.com/joesobo/CodeGraphyV4/commit/2a8751c14492b23e292c28af8646e64b4251ee83), [`d11c799`](https://github.com/joesobo/CodeGraphyV4/commit/d11c799e29f547543184aed14487b6c7d6476326), [`265728a`](https://github.com/joesobo/CodeGraphyV4/commit/265728adb88828772fc9e8b8745aefc36bc55a08)]:
  - @codegraphy-dev/plugin-api@3.1.0

## 2.1.0

### Minor Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Users install plugins at the user or tool level. CodeGraphy finds them through the installed-plugin cache, enables them per CodeGraphy Workspace through the ordered `plugins` array, and applies workspace-local `options`.

Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.

### Patch Changes

- Updated dependencies [[`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4)]:
  - @codegraphy-dev/plugin-api@3.0.0

## 2.0.4

### Patch Changes

- Updated dependencies [[`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1)]:
  - @codegraphy-dev/plugin-api@2.0.0

## 2.0.3

### Patch Changes

- Updated dependencies [[`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f)]:
  - @codegraphy-dev/plugin-api@1.2.0

## 2.0.2

### Patch Changes

- [#181](https://github.com/joesobo/CodeGraphyV4/pull/181) [`a3c16f3`](https://github.com/joesobo/CodeGraphyV4/commit/a3c16f3a0440d513f1098fb46175402a6070ab91) Thanks [@joesobo](https://github.com/joesobo)! - Show language icons in graph nodes, add Material-style built-in node theming in the core extension, and expose color, icon, and shape controls in custom legend rules.

## 2.0.1

### Patch Changes

- Updated dependencies [[`bae8657`](https://github.com/joesobo/CodeGraphyV4/commit/bae86577832441943b8cc83130617d1f79c0dc83)]:
  - @codegraphy-dev/plugin-api@1.1.0

## 2.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

### Minor Changes

- [#173](https://github.com/joesobo/CodeGraphyV4/pull/173) [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c) Thanks [@joesobo](https://github.com/joesobo)! - Add a built-in TypeScript plugin example for the new API, including a focused imports view with external package nodes.

### Patch Changes

- Updated dependencies [[`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955), [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20), [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c)]:
  - @codegraphy-dev/plugin-api@1.0.0

## 1.0.1

### Patch Changes

- Fix companion extension activation so the core graph refreshes when language plugins register and their connections appear reliably.

- Refresh the published extension and plugin package listings with updated README links, package icons, and marketplace metadata.

- Updated dependencies []:
  - @codegraphy-dev/plugin-api@0.1.1
