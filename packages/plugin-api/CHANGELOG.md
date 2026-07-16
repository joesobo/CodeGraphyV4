# @codegraphy-dev/plugin-api

## 6.0.0

### Major Changes

- Advance the host runtime compatibility protocol to Plugin API 3. Plugins must declare `apiVersion: '^3.0.0'`; plugins targeting the removed v2 contracts are rejected before registration.

- [#308](https://github.com/joesobo/CodeGraphyV4/pull/308) [`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974) Thanks [@joesobo](https://github.com/joesobo)! - CodeGraphy now provides one supported 2D Relationship Graph and removes the 3D graph mode, its toolbar toggle, 3D node shapes, 3D camera state, and Three.js renderer settings. Existing workspaces open directly in the 2D graph; saved 3D preferences are ignored.

  This is a breaking Plugin API change. Plugin authors must remove `GraphNodeShape3D`, `shape3D`, `graphMode`, three-dimensional node coordinates (`z`, `fz`, and `vz`), and 3D values in selected-node position payloads. Graph View contributions, drag callbacks, context-menu selectors, and viewport adapters now receive only two-dimensional graph state. The Unity plugin continues to contribute Unity graph data but no longer supplies 3D presentation metadata.

- [#308](https://github.com/joesobo/CodeGraphyV4/pull/308) [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e) Thanks [@joesobo](https://github.com/joesobo)! - CodeGraphy now opens one current-workspace Relationship Graph and removes the Timeline panel, commit-by-commit Graph Revision playback, revision controls, and Git-history Churn node sizing. Existing workspaces keep their current graph settings, but saved Timeline state and Churn sizing selections no longer affect the graph. Choose Connections or File Size for semantic node sizing.

  This is a breaking Plugin API and Core package change. Plugin authors must remove the `timeline-panel` slot, Timeline lifecycle events and payloads, `timelineActive` contribution/context fields, Timeline analysis mode and `commitSha`, and the optional `churn` graph-node field. Core callers must stop passing churn counts into graph construction. Plugins should analyze the current CodeGraphy Workspace and contribute to the normal Graph View instead of branching on Timeline state.

## 5.3.0

### Minor Changes

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now keeps plugin-owned evidence and symbol evidence out of runtime memory until the user enables the matching Graph Scope or plugin. If the evidence is already in Graph Cache, the first toggle hydrates it with 1 cache read, 0 analysis jobs, and 0 cache saves; later off/on toggles reuse memory with 0 additional cache reads.

  On the current `main` versus PR CodeGraphy monorepo benchmark, baseline runtime cache size improved from 18,583,676 serialized bytes to 10,781,465 serialized bytes: 7,802,211 bytes less, a 41.98% reduction, and 1.72x smaller. Retained symbol facts stay at 0 until Symbol scope is enabled instead of retaining 11,631 hidden symbol facts on startup.

  Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

## 5.2.0

### Minor Changes

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6) Thanks [@joesobo](https://github.com/joesobo)! - Add a reusable Events edge type and emit Unity persistent-call event edges from serialized scenes and prefabs.

- [#281](https://github.com/joesobo/CodeGraphyV4/pull/281) [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc) Thanks [@joesobo](https://github.com/joesobo)! - Upgrade C# Tree-sitter graph support with richer symbol nodes and reusable edge kinds for using, type, call, inheritance, implementation, and containment relationships.

## 5.1.0

### Minor Changes

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472) Thanks [@joesobo](https://github.com/joesobo)! - Add a Graph View world background slot for plugin-owned graph artwork.

  Plugins can now mount visual webview content behind the graph nodes and edges with `graph.stage.worldBackground`, while existing world and viewport overlay slots remain available for UI that should sit above the graph.

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096) Thanks [@joesobo](https://github.com/joesobo)! - Expose plugin-owned webview data helpers to CodeGraphy plugins.

  Webview plugins can now call `getPluginData()` and `setPluginData(data)` to read and persist their own workspace UI state through the host instead of using ad hoc host messages or extension-owned settings.

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136) Thanks [@joesobo](https://github.com/joesobo)! - Dispose webview plugin work immediately when a plugin is disabled or its webview assets are reset.

  Webview plugin `activate(api)` functions can now return a cleanup function or `Disposable`. CodeGraphy calls that cleanup during plugin disable/reset so plugin-owned UI can stop timers, animation loops, message subscriptions, and injected DOM without waiting for a webview reload.

  The Particles plugin now uses that cleanup path to stop active background effects, clear its Theme controls, unsubscribe from plugin data updates, and remove its injected styles as soon as the plugin is disabled.

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f) Thanks [@joesobo](https://github.com/joesobo)! - Add ordered webview slot contributions for plugin-owned UI.

  Webview plugins can now call `api.registerSlotContribution(slot, { id, order, render })` to mount UI into named CodeGraphy slots. The host owns the contribution container, ordering, and cleanup, so plugin UI can use normal component structure without the extension needing to know what each plugin renders.

### Patch Changes

- [#270](https://github.com/joesobo/CodeGraphyV4/pull/270) [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b) Thanks [@joesobo](https://github.com/joesobo)! - Allow current and future Node releases while keeping Node 20 as the minimum supported runtime.

## 5.0.0

### Major Changes

- [#259](https://github.com/joesobo/CodeGraphyV4/pull/259) [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12) Thanks [@joesobo](https://github.com/joesobo)! - Replace the edge-only capability hook with Graph Scope capabilities.

  Plugins must replace `contributeEdgeTypeCapabilities(context)` with `contributeGraphScopeCapabilities(context)` and return `{ nodeTypes, edgeTypes }`. Capability declarations are still independent from emitted graph records, but now cover both Node Type and Edge Type controls.

### Patch Changes

- [#257](https://github.com/joesobo/CodeGraphyV4/pull/257) [`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316) Thanks [@joesobo](https://github.com/joesobo)! - Refresh the C example workspace as a tiny logger with C-native include edges plus prototype, struct, union, enum, typedef, function, and global graph coverage. Include relationships now stay edge-only for C-family analysis, enabled symbols can remain visible as orphans until Contains is shown, variable child toggles now activate the Variable parent without also activating Symbol, and graph scope node toggle bursts now coalesce settings updates and graph redraws instead of lagging through every intermediate state.

## 4.0.0

### Major Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561) Thanks [@joesobo](https://github.com/joesobo)! - Remove the unused Tests and Re-exports edge types from Graph Scope.

  Export-from relationships now appear as Imports instead of a separate Re-exports edge, so users have fewer duplicate-looking edge toggles to reason about.

### Minor Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886) Thanks [@joesobo](https://github.com/joesobo)! - Graph Scope now shows Edge Type controls from indexed workspace capabilities instead of every theoretical toggle or only currently observed edges. Relevant Edge Types can appear even when the latest graph has zero matching relationships, and CodeGraphy decides the relevant Edge Type list before Depth Mode, filters, search, or other view narrowing changes what is displayed. Edge Type controls stay visible but disabled until the workspace has a Graph Cache, and Graph Scope returns to Node Types if an unindexed workspace is opened while Edge Types was selected. Any existing Graph Cache enables Edge Type controls, even while Graph Cache Sync catches up.

  Source-language workspaces now surface Calls as a relevant Edge Type when their analyzer can emit imported-call relationships. C++ now emits Calls edges for calls to declarations in included headers, and the Godot plugin now emits Calls edges for `class_name` static method calls while keeping `load()` and `preload()` on the Loads edge.

  Plugins can declare core or plugin-owned Edge Type capabilities with `contributeEdgeTypeCapabilities(context)`. Plugin authors should use `context.filePaths` when a plugin supports multiple languages or file families with different Edge Types, so Graph Scope only shows toggles that are relevant to the indexed workspace.

- [#251](https://github.com/joesobo/CodeGraphyV4/pull/251) [`1d9180c`](https://github.com/joesobo/CodeGraphyV4/commit/1d9180c29554c163e660a7c899c59755c4b0bdff) Thanks [@joesobo](https://github.com/joesobo)! - Add Graph Scope tooltips for Node Types and Edge Types, with optional plugin-provided descriptions and compact examples.

## 3.1.2

### Patch Changes

- [#224](https://github.com/joesobo/CodeGraphyV4/pull/224) [`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c) Thanks [@joesobo](https://github.com/joesobo)! - Keep Symbol-scoped Graph View payloads small by caching baseline file relationships first, lazily enriching Symbols and plugin analysis when those scopes are enabled, and reusing enriched cache tiers when they are toggled back on.

## 3.1.1

### Patch Changes

- [#220](https://github.com/joesobo/CodeGraphyV4/pull/220) [`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5) Thanks [@joesobo](https://github.com/joesobo)! - Allow current Node 20 releases without workspace engine warnings.

## 3.1.0

### Minor Changes

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`582c514`](https://github.com/joesobo/CodeGraphyV4/commit/582c5140a3ffee19df917ce6f0796fd0f80d53e0) Thanks [@joesobo](https://github.com/joesobo)! - Add sized 2D rectangle node presentation so plugin nodes can render, pick, and collide at their expanded visual bounds.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b) Thanks [@joesobo](https://github.com/joesobo)! - Add the Extract Pro foundation: Access Provider contracts, plugin-owned data persistence delivered to package plugin factories, Graph View runtime/projection/context-menu/UI/force-adapter contribution contracts and hosts, and local plugin linking for private paid plugins.

  Graph View contribution callbacks receive live host context such as the current graph mode and timeline state.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`8b559dd`](https://github.com/joesobo/CodeGraphyV4/commit/8b559dd3204b87808dd1834fd2c00277d7f06d62) Thanks [@joesobo](https://github.com/joesobo)! - Expose live Graph View viewport node updates and per-node physics overrides so plugins can resize runtime nodes without restarting graph physics.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`005e4f5`](https://github.com/joesobo/CodeGraphyV4/commit/005e4f522b6295f6fbf068c79571f9182e963172) Thanks [@joesobo](https://github.com/joesobo)! - Add a Graph View node drag-end contribution so plugins can own fixed-position drag behavior without hard-coding plugin features in the host graph.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`a5f6df8`](https://github.com/joesobo/CodeGraphyV4/commit/a5f6df8b8ad5e89fddb43aaa77e0fc80e732f521) Thanks [@joesobo](https://github.com/joesobo)! - Fix package plugin toggles so Graph View contributions are added and removed immediately, add create-menu placement for plugin context menu actions, and keep plugin contribution snapshots stable while rendering the graph.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`265728a`](https://github.com/joesobo/CodeGraphyV4/commit/265728adb88828772fc9e8b8745aefc36bc55a08) Thanks [@joesobo](https://github.com/joesobo)! - Add plugin runtime node pointer areas so custom-shaped nodes can use graph-owned pointer picking.

### Patch Changes

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`2b15c9c`](https://github.com/joesobo/CodeGraphyV4/commit/2b15c9c61c4d954554a4b979540b89a8ef595061) Thanks [@joesobo](https://github.com/joesobo)! - Expose graph mode and timeline state to Graph View context menu contributions so plugins can hide mode-specific actions.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`4e4a1ac`](https://github.com/joesobo/CodeGraphyV4/commit/4e4a1ac9187d9b6feaaa91437293b2fab8120cc2) Thanks [@joesobo](https://github.com/joesobo)! - Allow runtime node coordinate fields to be explicitly cleared with `undefined` in exact-optional TypeScript projects.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`c7a6ffc`](https://github.com/joesobo/CodeGraphyV4/commit/c7a6ffc1d271f1342139e0d7b79e6accb20cec7e) Thanks [@joesobo](https://github.com/joesobo)! - Allow graph plugins to request rounded corners for 2D rectangle nodes.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`07ff638`](https://github.com/joesobo/CodeGraphyV4/commit/07ff638cdc127a455f5606c6205e78b2ac0d3761) Thanks [@joesobo](https://github.com/joesobo)! - Pass current graph physics settings to Graph View force adapters so feature plugins can match CodeGraphy's configured force behavior.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`2a8751c`](https://github.com/joesobo/CodeGraphyV4/commit/2a8751c14492b23e292c28af8646e64b4251ee83) Thanks [@joesobo](https://github.com/joesobo)! - Expose runtime node coordinate, fixed-position, and velocity fields in the public Graph View API.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`d11c799`](https://github.com/joesobo/CodeGraphyV4/commit/d11c799e29f547543184aed14487b6c7d6476326) Thanks [@joesobo](https://github.com/joesobo)! - Expose the current graph snapshot on the plugin host API for plugin-owned exporters and host actions.

## 3.0.0

### Major Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Extract CodeGraphy's shared engine into `@codegraphy-dev/core`. Core now owns headless CodeGraphy Workspace indexing, File Discovery, Tree-sitter analysis, plugin execution, Graph Cache reads/writes, workspace freshness status, and Graph Query without depending on VS Code.

  The VS Code extension now acts as the visualization and editor adapter over core, and the public Plugin API is headless: VS Code-specific webview, command, decoration, and host bridge contracts stay inside the extension package.

### Minor Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Plugins are installed at the user/tool level, discovered through the installed-plugin cache, enabled per CodeGraphy Workspace through the ordered `plugins` array, and configured with workspace-local `options`.

  Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.

- [#204](https://github.com/joesobo/CodeGraphyV4/pull/204) [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4) Thanks [@joesobo](https://github.com/joesobo)! - Add Symbol and Variable nodes to the Relationship Graph with Graph Scope controls, `contains` and `overrides` edges, scoped Legend defaults, symbol-aware exports, and richer Graph Query/MCP symbol payloads.

  Default node Legend entries now use singular labels, keep their colors directly editable, and rely on Custom Legend Entries for overrides instead of separate color-enable toggles. Core symbol defaults stay intentionally broad; language-specific symbol kinds fall back to Symbol styling unless a plugin contributes its own defaults. The plugin API now documents symbol endpoint projection for `fromSymbolId` and `toSymbolId`, and the Godot plugin emits `class_name`, function, constant, variable, and enum declarations as symbol nodes. Symbol hover cards now show the symbol name, containing file, symbol type, and graph connection counts directly from the visible graph.

## 2.0.0

### Major Changes

- [#199](https://github.com/joesobo/CodeGraphyV4/pull/199) [`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1) Thanks [@joesobo](https://github.com/joesobo)! - Replace editor-visit access-count sizing with Git history churn sizing. Size by Churn appears after Git history is indexed, graph exports include churn, and graph node metadata no longer exposes accessCount.

## 1.2.0

### Minor Changes

- [#188](https://github.com/joesobo/CodeGraphyV4/pull/188) [`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f) Thanks [@joesobo](https://github.com/joesobo)! - Apply graph scope, structural projection, filters, search, and orphan visibility through one shared visible graph derivation pipeline.

  Core structural nesting edges now use the `nests` edge kind. Namespaced edge kinds remain reserved for plugin-owned relationships.

## 1.1.0

### Minor Changes

- [#176](https://github.com/joesobo/CodeGraphyV4/pull/176) [`bae8657`](https://github.com/joesobo/CodeGraphyV4/commit/bae86577832441943b8cc83130617d1f79c0dc83) Thanks [@joesobo](https://github.com/joesobo)! - Add optional Type imports graph edges for TypeScript type-only imports.

## 1.0.0

### Major Changes

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`f0311fb`](https://github.com/joesobo/CodeGraphyV4/commit/f0311fb0bcae07227f42c6f9f41018b0ad4ae955) Thanks [@joesobo](https://github.com/joesobo)! - Ship the code index rearchitecture: unified graph controls, repo-local `.codegraphy` settings, symbol export, edge-first connection exports, plugin ordering, and the new per-file analysis contract for plugins. The public plugin API now centers `analyzeFile(...)` results and no longer exposes the old `IConnection` / `IConnectionDetector` analysis types.

- [#174](https://github.com/joesobo/CodeGraphyV4/pull/174) [`75c8321`](https://github.com/joesobo/CodeGraphyV4/commit/75c83218175213d5adb9c205191d92003770db20) Thanks [@joesobo](https://github.com/joesobo)! - Remove the legacy `detectConnections(...)` plugin hook and require plugin-contributed analysis to use `analyzeFile(...)` with the shared per-file analysis result shape.

- [#173](https://github.com/joesobo/CodeGraphyV4/pull/173) [`94ec5e4`](https://github.com/joesobo/CodeGraphyV4/commit/94ec5e45db07ea588db74c5a549bf3201ac2784c) Thanks [@joesobo](https://github.com/joesobo)! - Broaden the plugin graph API with shared per-file analysis results, canonical `kind`/`sources` graph contracts, repo-backed graph queries, toolbar action registration, named graph slots, tooltip actions, and scoped custom-view recompute dependencies.

## 0.1.1

### Patch Changes

- Refresh the published extension and plugin package listings with updated README links, package icons, and marketplace metadata.
