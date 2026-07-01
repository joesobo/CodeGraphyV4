# @codegraphy-dev/core

## 1.7.2

### Patch Changes

- [#300](https://github.com/joesobo/CodeGraphyV4/pull/300) [`e3e7e61`](https://github.com/joesobo/CodeGraphyV4/commit/e3e7e6166fce6d72b2117a36a9eb1510562fb6b7) Thanks [@joesobo](https://github.com/joesobo)! - Prefer bundled workspace plugin package records over stale installed plugin cache records when both declare the same plugin.

## 1.7.1

### Patch Changes

- [#294](https://github.com/joesobo/CodeGraphyV4/pull/294) [`e950612`](https://github.com/joesobo/CodeGraphyV4/commit/e95061239ab63fc3c5e64ec8b653db7466271979) Thanks [@joesobo](https://github.com/joesobo)! - Large CodeGraphy workspaces now index, save, and filter graph data much faster. On the CodeGraphy monorepo benchmark, cold indexing improved from 214.04s to 17.28s: 196.76s faster, a 91.93% reduction, and 12.39x faster. Graph Cache saves improved from 122,757ms to 10,904ms: 111,853ms faster, a 91.12% reduction, and 11.26x faster. Graph Cache size shrank from 64,638,976 bytes to 18,153,472 bytes: 46,485,504 bytes smaller, a 71.92% reduction, and 3.56x smaller.

  The same benchmark now projects the current Visible Graph in 12ms instead of 775ms: 763ms faster, a 98.45% reduction, and 64.58x faster. Folder-node projection improved from 1,369ms to 32ms: 1,337ms faster, a 97.66% reduction, and 42.78x faster. Import-edge-off projection improved from 153ms to 7ms: 146ms faster, a 95.42% reduction, and 21.86x faster. Search projection improved from 781ms to 12ms: 769ms faster, a 98.46% reduction, and 65.08x faster.

  Graph Cache replay also normalizes cached path separators before checking gitignore rules, so ignored files stay filtered across platforms during warm starts.

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Saved-file updates now patch changed Graph Cache rows instead of rewriting the whole Graph Cache. On the current `main` versus PR CodeGraphy monorepo benchmark, edit persistence improved from a 25,705ms average full save to a 341ms average one-row patch: 25,364ms faster, a 98.67% reduction, and 75.47x faster.

  Full Re-index still replaces the complete Graph Cache, while normal add, change, and delete file updates delete and upsert only the changed cache rows inside one transaction.

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now keeps plugin-owned evidence and symbol evidence out of runtime memory until the user enables the matching Graph Scope or plugin. If the evidence is already in Graph Cache, the first toggle hydrates it with 1 cache read, 0 analysis jobs, and 0 cache saves; later off/on toggles reuse memory with 0 additional cache reads.

  On the current `main` versus PR CodeGraphy monorepo benchmark, baseline runtime cache size improved from 18,583,676 serialized bytes to 10,781,465 serialized bytes: 7,802,211 bytes less, a 41.98% reduction, and 1.72x smaller. Retained symbol facts stay at 0 until Symbol scope is enabled instead of retaining 11,631 hidden symbol facts on startup.

  Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

- Updated dependencies [[`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/plugin-api@5.3.0
  - @codegraphy-dev/plugin-markdown@1.1.8

## 1.7.0

### Minor Changes

- [#281](https://github.com/joesobo/CodeGraphyV4/pull/281) [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc) Thanks [@joesobo](https://github.com/joesobo)! - Upgrade C# Tree-sitter graph support with richer symbol nodes and reusable edge kinds for using, type, call, inheritance, implementation, and containment relationships.

- [#285](https://github.com/joesobo/CodeGraphyV4/pull/285) [`2e11809`](https://github.com/joesobo/CodeGraphyV4/commit/2e11809bd5d3983436b25c0916a01499f025aa7e) Thanks [@joesobo](https://github.com/joesobo)! - Expand Dart graph support with mixin, alias, extension, method, local, constant, reference, and contains graph scope coverage.

- [#288](https://github.com/joesobo/CodeGraphyV4/pull/288) [`b435b28`](https://github.com/joesobo/CodeGraphyV4/commit/b435b28121c3f0202999dd99dc074ec146ea2006) Thanks [@joesobo](https://github.com/joesobo)! - Expand Godot graph support with Scene, Resource, Autoload, Scene Node, Signal, Exported Property, Signal Connections, and plain variable Graph Scope coverage backed by the runnable Godot example. Signal Connections now link declared GDScript signals without showing false self-connections for built-in engine signals, and incremental indexing refreshes those links when receiver scripts change. Exported Property nodes now cover both inline and standalone `@export` declarations.

  File-only Graph Scope views now keep relationships whose hidden symbol endpoints live in visible files, so Godot Loads edges remain complete when Resource nodes are hidden.

- [#287](https://github.com/joesobo/CodeGraphyV4/pull/287) [`83da5b6`](https://github.com/joesobo/CodeGraphyV4/commit/83da5b6b609535061c236b6b25869f3be985fc58) Thanks [@joesobo](https://github.com/joesobo)! - Upgrade Haskell Tree-sitter graph support with generic type, class, function, constant, field, parameter, local, reference, call, import, and containment coverage.

- [#289](https://github.com/joesobo/CodeGraphyV4/pull/289) [`b63fe4f`](https://github.com/joesobo/CodeGraphyV4/commit/b63fe4f685e0d64deeadd838d730035926f9803a) Thanks [@joesobo](https://github.com/joesobo)! - Upgrade TypeScript graph support with containment scope, a runnable palette-generator example, and consistent file-level type-import relationships when imported type symbols are visible.

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`3924f42`](https://github.com/joesobo/CodeGraphyV4/commit/3924f4210b1915dea5c203d4d07bb4d0e485e41b) Thanks [@joesobo](https://github.com/joesobo)! - Add initial Unity plugin support for parsing scenes and prefabs into GameObject and Component graph symbols with Unity Graph Scope defaults, file-to-GameObject-to-Component containment, icon-backed Unity file theming, default Unity generated-file filters, and Unity-sourced reference edges for scripts and prefab instances.

### Patch Changes

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`7a62728`](https://github.com/joesobo/CodeGraphyV4/commit/7a627280ab37ad4a1152b6e681c5cb8fcf1a928e) Thanks [@joesobo](https://github.com/joesobo)! - Fix C# inheritance and implements graph edges for Unity-style scripts while avoiding false calls to base classes.

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`2e33507`](https://github.com/joesobo/CodeGraphyV4/commit/2e33507c086487bf92a44cf24e787cd9a8158910) Thanks [@joesobo](https://github.com/joesobo)! - Keep core file-level edges visible when plugin symbol rows are shown without core symbol rows.

- Updated dependencies [[`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6), [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc)]:
  - @codegraphy-dev/plugin-api@5.2.0
  - @codegraphy-dev/plugin-markdown@1.1.7

## 1.6.1

### Patch Changes

- [#270](https://github.com/joesobo/CodeGraphyV4/pull/270) [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b) Thanks [@joesobo](https://github.com/joesobo)! - Allow current and future Node releases while keeping Node 20 as the minimum supported runtime.

- Updated dependencies [[`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472), [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096), [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b), [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136), [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f)]:
  - @codegraphy-dev/plugin-api@5.1.0
  - @codegraphy-dev/plugin-markdown@1.1.6

## 1.6.0

### Minor Changes

- [#263](https://github.com/joesobo/CodeGraphyV4/pull/263) [`e7237bf`](https://github.com/joesobo/CodeGraphyV4/commit/e7237bf5e676bf20a0b5ca3445f5a597f072b64b) Thanks [@joesobo](https://github.com/joesobo)! - Upgrade C++ graph scope support with dedicated C++ symbol and variable node controls, include/call/inheritance/contains/override edges, and C++ example acceptance coverage.

## 1.5.0

### Minor Changes

- [#259](https://github.com/joesobo/CodeGraphyV4/pull/259) [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12) Thanks [@joesobo](https://github.com/joesobo)! - Hide impossible Graph Scope Node Type toggles for the current workspace.

  Graph Scope now uses active analyzer and plugin capabilities to decide which Symbol and Variable child toggles are relevant across every indexed file in the workspace. File, Folder, and Package stay visible as structural Node Types. Symbol and Variable are shown only when they have at least one relevant child toggle.

### Patch Changes

- [#257](https://github.com/joesobo/CodeGraphyV4/pull/257) [`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316) Thanks [@joesobo](https://github.com/joesobo)! - Refresh the C example workspace as a tiny logger with C-native include edges plus prototype, struct, union, enum, typedef, function, and global graph coverage. Include relationships now stay edge-only for C-family analysis, enabled symbols can remain visible as orphans until Contains is shown, variable child toggles now activate the Variable parent without also activating Symbol, and graph scope node toggle bursts now coalesce settings updates and graph redraws instead of lagging through every intermediate state.

- [#258](https://github.com/joesobo/CodeGraphyV4/pull/258) [`20b9b40`](https://github.com/joesobo/CodeGraphyV4/commit/20b9b40e970f1fc15e3c0bdd7a72531ce8ca0844) Thanks [@joesobo](https://github.com/joesobo)! - Model Tree-sitter as core analysis instead of a plugin so hover and plugin UI metadata only show real plugin contributions.

- Updated dependencies [[`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12)]:
  - @codegraphy-dev/plugin-api@5.0.0
  - @codegraphy-dev/plugin-markdown@1.1.5

## 1.4.0

### Minor Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886) Thanks [@joesobo](https://github.com/joesobo)! - Graph Scope now shows Edge Type controls from indexed workspace capabilities instead of every theoretical toggle or only currently observed edges. Relevant Edge Types can appear even when the latest graph has zero matching relationships, and CodeGraphy decides the relevant Edge Type list before Depth Mode, filters, search, or other view narrowing changes what is displayed. Edge Type controls stay visible but disabled until the workspace has a Graph Cache, and Graph Scope returns to Node Types if an unindexed workspace is opened while Edge Types was selected. Any existing Graph Cache enables Edge Type controls, even while Graph Cache Sync catches up.

  Source-language workspaces now surface Calls as a relevant Edge Type when their analyzer can emit imported-call relationships. C++ now emits Calls edges for calls to declarations in included headers, and the Godot plugin now emits Calls edges for `class_name` static method calls while keeping `load()` and `preload()` on the Loads edge.

  Plugins can declare core or plugin-owned Edge Type capabilities with `contributeEdgeTypeCapabilities(context)`. Plugin authors should use `context.filePaths` when a plugin supports multiple languages or file families with different Edge Types, so Graph Scope only shows toggles that are relevant to the indexed workspace.

- [#247](https://github.com/joesobo/CodeGraphyV4/pull/247) [`91e33a2`](https://github.com/joesobo/CodeGraphyV4/commit/91e33a219ab1c1db2069391525de0786921581fb) Thanks [@joesobo](https://github.com/joesobo)! - Add core language coverage for Objective-C, Scala, and Pascal workspaces.

  Objective-C and Scala use native Tree-sitter grammars so users get file nodes, local/imported file relationships, inheritance where the analyzer can resolve it, and useful symbol nodes for classes, protocols, traits, objects, enums, type aliases, and methods. Pascal is handled by a core text-baseline analyzer because the available `tree-sitter-pascal` package does not ship a usable native binding; users still get Pascal unit `uses` relationships, class inheritance relationships, and class/record/interface/procedure symbols without breaking the Tree-sitter runtime.

### Patch Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2) Thanks [@joesobo](https://github.com/joesobo)! - Stop attributing unmatched C function calls to the only included header.

  C call edges now point to included headers only when the analyzer finds a matching function declaration in that header. Local helper calls and other unresolved calls no longer create misleading file-to-header Call edges just because the source file has one include.

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2) Thanks [@joesobo](https://github.com/joesobo)! - Keep disabled plugins fully inactive across Graph View surfaces.

  When a workspace disables a plugin, CodeGraphy now excludes that plugin's graph analysis contributions, default filter groups, Graph Scope Node Type and Edge Type definitions, Edge Type capabilities, Graph View contribution statuses, toolbar/context/export actions, and webview assets. This keeps disabled plugins from leaving behind toggles or UI actions for features that are no longer active.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`4907fa2`](https://github.com/joesobo/CodeGraphyV4/commit/4907fa2b31c417f19045690526deb39877a82755) Thanks [@joesobo](https://github.com/joesobo)! - Keep disabled plugins unloaded during Core and VS Code extension indexing so disabled package, bundled Markdown, and provided plugin runtimes are not registered or run.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`0d558f0`](https://github.com/joesobo/CodeGraphyV4/commit/0d558f02e64760e9800fe40ab608eea6a73631fb) Thanks [@joesobo](https://github.com/joesobo)! - Warn when enabled plugin IDs cannot resolve to exactly one runtime.

  Enabled plugins that are missing or claimed by multiple installed packages now stay inactive before runtime import. CodeGraphy reports a developer-console warning from static metadata and does not silently choose a package or load conflicting plugin code.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`ac1cff8`](https://github.com/joesobo/CodeGraphyV4/commit/ac1cff8ded4ff8aed45ca3af5fa6028f3872e9c4) Thanks [@joesobo](https://github.com/joesobo)! - Honor workspace-disabled plugin IDs throughout Core indexing.

  Plugins set to `enabled: false` now stay unloaded even when a caller provides the plugin runtime directly. Core derives disabled plugin decisions from Plugin Activity State before registry setup, analysis, graph building, and lifecycle notifications.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`f8787fa`](https://github.com/joesobo/CodeGraphyV4/commit/f8787fae1b40739301dfd784b2a6a1177acebfb7) Thanks [@joesobo](https://github.com/joesobo)! - Persist workspace plugin activity by Plugin ID with an explicit enabled state.

  New workspaces now write Markdown as an enabled plugin intent entry, and plugin toggles keep `enabled: false` entries when users disable a plugin. CodeGraphy uses the Plugin ID from static plugin metadata to resolve installed package runtimes, so disabled plugins keep their user intent and plugin-owned data without loading runtime code.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`bc3e9c2`](https://github.com/joesobo/CodeGraphyV4/commit/bc3e9c2e6ef028832aa66458a29b4c54d02fe037) Thanks [@joesobo](https://github.com/joesobo)! - Make CLI, MCP, and workspace status output use Plugin ID activity.

  `codegraphy plugins enable` and `codegraphy plugins disable` now resolve package-name input to the static Plugin ID before writing workspace settings, list enabled plugins by Plugin ID, and keep disabled plugins as `enabled: false` intent instead of removing them. Workspace status reports enabled Plugin IDs, example settings use the same `id` plus `enabled` shape, and MCP enable and disable tools now accept `pluginId` so agents use the same workspace activity identity as Core.

  Plugin registration and linking now require package plugins to declare their static Plugin ID in `codegraphy.json`, and Core rejects package runtimes whose returned `plugin.id` does not match that static ID.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`6917391`](https://github.com/joesobo/CodeGraphyV4/commit/69173916c7bd341296f23dcb11732746d273f805) Thanks [@joesobo](https://github.com/joesobo)! - Make plugin toggles use Plugin IDs as the workspace activity identity.

  The Plugins panel and Graph View settings now enable and disable plugins by the static Plugin ID, while package names stay as install metadata. Disabled plugins are written as explicit `enabled: false` workspace entries, enabled plugins are written as `enabled: true`, and default plugin options are looked up by Plugin ID with a package-name fallback for older installed-plugin records.

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561) Thanks [@joesobo](https://github.com/joesobo)! - Remove the unused Tests and Re-exports edge types from Graph Scope.

  Export-from relationships now appear as Imports instead of a separate Re-exports edge, so users have fewer duplicate-looking edge toggles to reason about.

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`77503ee`](https://github.com/joesobo/CodeGraphyV4/commit/77503ee7b437924386fb86b4381847a6a16deb1c) Thanks [@joesobo](https://github.com/joesobo)! - Fix symbol-level graph scope behavior for inheritance, containment, overrides, and language example graphs.

- Updated dependencies [[`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886), [`1d9180c`](https://github.com/joesobo/CodeGraphyV4/commit/1d9180c29554c163e660a7c899c59755c4b0bdff), [`b1be863`](https://github.com/joesobo/CodeGraphyV4/commit/b1be8636176b990e878b17e1aad751877568e5d5), [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561)]:
  - @codegraphy-dev/plugin-api@4.0.0
  - @codegraphy-dev/plugin-markdown@1.1.4

## 1.3.0

### Minor Changes

- [#236](https://github.com/joesobo/CodeGraphyV4/pull/236) [`7ff7ef3`](https://github.com/joesobo/CodeGraphyV4/commit/7ff7ef3aaea18770ada9f6262c1dd7800ce0c151) Thanks [@joesobo](https://github.com/joesobo)! - Add Verbose Diagnostics for support and agent debugging.

  In the VS Code extension, Settings > Performance now includes a **Verbose Diagnostics** toggle. It is off by default and persists to `.codegraphy/settings.json` as `verboseDiagnostics`. When enabled, CodeGraphy writes factual `[CodeGraphy]` event lines to the VS Code Developer Tools console for extension activation, webview bootstrap, analysis requests, and Graph Cache load decisions.

  The Core CLI now accepts a global `--verbose` flag on every command. Verbose command diagnostics are written outside JSON stdout so status and query-style output remains parseable.

  Every MCP tool now accepts `verboseDiagnostics?: boolean`. When enabled, tool results include a `diagnostics` array with factual Core Package events such as workspace status reads, indexing phases, Graph Cache state, Graph Query execution, counts, and durations. Default MCP responses stay unchanged when diagnostics are disabled.

### Patch Changes

- [#237](https://github.com/joesobo/CodeGraphyV4/pull/237) [`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288) Thanks [@joesobo](https://github.com/joesobo)! - Fix Java graph relationships in the basic file view. The Java graph now counts the import and call from App.java to Helper.java as two connections collapsed into one visible edge, while superclass declarations no longer add an extra BaseService.java file connection.

## 1.2.1

### Patch Changes

- [#235](https://github.com/joesobo/CodeGraphyV4/pull/235) [`ad8f8af`](https://github.com/joesobo/CodeGraphyV4/commit/ad8f8af9c1bcd6cd950c7f248ef3d662ab0c019f) Thanks [@joesobo](https://github.com/joesobo)! - Make Indexing progress clearer by separating preparation from file analysis, replacing final cache-save progress with graph-view update progress, and hiding old graph stats until the indexed graph is published.

- [#235](https://github.com/joesobo/CodeGraphyV4/pull/235) [`c82e598`](https://github.com/joesobo/CodeGraphyV4/commit/c82e598a59349d9d3ff936627216baf518636800) Thanks [@joesobo](https://github.com/joesobo)! - Improve Graph Cache load and save responsiveness during startup and warm-cache graph replay.

## 1.2.0

### Minor Changes

- [#223](https://github.com/joesobo/CodeGraphyV4/pull/223) [`a2625ba`](https://github.com/joesobo/CodeGraphyV4/commit/a2625ba942287b43f939abfe5a5ca68f8e730680) Thanks [@joesobo](https://github.com/joesobo)! - Add Core-owned workspace indexing engine APIs for retained indexing state, changed-file refreshes, configured plugin entries, plugin status queries, and package plugin toggle planning. Core indexing now retains complete graph data instead of accepting Graph View orphan-display settings.

### Patch Changes

- [#224](https://github.com/joesobo/CodeGraphyV4/pull/224) [`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c) Thanks [@joesobo](https://github.com/joesobo)! - Keep Symbol-scoped Graph View payloads small by caching baseline file relationships first, lazily enriching Symbols and plugin analysis when those scopes are enabled, and reusing enriched cache tiers when they are toggled back on.

- Updated dependencies [[`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c)]:
  - @codegraphy-dev/plugin-api@3.1.2
  - @codegraphy-dev/plugin-markdown@1.1.3

## 1.1.2

### Patch Changes

- [#220](https://github.com/joesobo/CodeGraphyV4/pull/220) [`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5) Thanks [@joesobo](https://github.com/joesobo)! - Allow current Node 20 releases without workspace engine warnings.

- Updated dependencies [[`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5)]:
  - @codegraphy-dev/plugin-api@3.1.1
  - @codegraphy-dev/plugin-markdown@1.1.2

## 1.1.1

### Patch Changes

- [#219](https://github.com/joesobo/CodeGraphyV4/pull/219) [`f531820`](https://github.com/joesobo/CodeGraphyV4/commit/f5318208b380a04b5e0f6ddcf3ebab7cd3641769) Thanks [@joesobo](https://github.com/joesobo)! - Keep workspace indexing responsive while rebuilding the Graph Cache from a missing or stale cache.

## 1.1.0

### Minor Changes

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b) Thanks [@joesobo](https://github.com/joesobo)! - Add the Extract Pro foundation: Access Provider contracts, plugin-owned data persistence delivered to package plugin factories, Graph View runtime/projection/context-menu/UI/force-adapter contribution contracts and hosts, and local plugin linking for private paid plugins.

  Graph View contribution callbacks receive live host context such as the current graph mode and timeline state.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`005e4f5`](https://github.com/joesobo/CodeGraphyV4/commit/005e4f522b6295f6fbf068c79571f9182e963172) Thanks [@joesobo](https://github.com/joesobo)! - Add a Graph View node drag-end contribution so plugins can own fixed-position drag behavior without hard-coding plugin features in the host graph.

### Patch Changes

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`c276081`](https://github.com/joesobo/CodeGraphyV4/commit/c276081a78ad290210ac667a0698d8ce87485edb) Thanks [@joesobo](https://github.com/joesobo)! - Keep package plugin rows stable across toggles, preserve plugin display names while disabled, remove obsolete plugin reordering controls, remove noisy runtime-availability subtext, and keep plugin-owned data saves from dropping graph settings.

- Updated dependencies [[`582c514`](https://github.com/joesobo/CodeGraphyV4/commit/582c5140a3ffee19df917ce6f0796fd0f80d53e0), [`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b), [`2b15c9c`](https://github.com/joesobo/CodeGraphyV4/commit/2b15c9c61c4d954554a4b979540b89a8ef595061), [`8b559dd`](https://github.com/joesobo/CodeGraphyV4/commit/8b559dd3204b87808dd1834fd2c00277d7f06d62), [`4e4a1ac`](https://github.com/joesobo/CodeGraphyV4/commit/4e4a1ac9187d9b6feaaa91437293b2fab8120cc2), [`005e4f5`](https://github.com/joesobo/CodeGraphyV4/commit/005e4f522b6295f6fbf068c79571f9182e963172), [`c7a6ffc`](https://github.com/joesobo/CodeGraphyV4/commit/c7a6ffc1d271f1342139e0d7b79e6accb20cec7e), [`07ff638`](https://github.com/joesobo/CodeGraphyV4/commit/07ff638cdc127a455f5606c6205e78b2ac0d3761), [`a5f6df8`](https://github.com/joesobo/CodeGraphyV4/commit/a5f6df8b8ad5e89fddb43aaa77e0fc80e732f521), [`2a8751c`](https://github.com/joesobo/CodeGraphyV4/commit/2a8751c14492b23e292c28af8646e64b4251ee83), [`d11c799`](https://github.com/joesobo/CodeGraphyV4/commit/d11c799e29f547543184aed14487b6c7d6476326), [`265728a`](https://github.com/joesobo/CodeGraphyV4/commit/265728adb88828772fc9e8b8745aefc36bc55a08)]:
  - @codegraphy-dev/plugin-api@3.1.0
  - @codegraphy-dev/plugin-markdown@1.1.1

## 1.0.0

### Major Changes

- [#215](https://github.com/joesobo/CodeGraphyV4/pull/215) [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512) Thanks [@joesobo](https://github.com/joesobo)! - Move the canonical `codegraphy` CLI into `@codegraphy-dev/core`. Plugin packages now use an explicit `codegraphy plugins register <package>` step before workspace-local enablement, and refresh-style plugin scanning has been removed from the supported flow.

  The MCP package now publishes only the agent-facing `codegraphy-mcp` server command and mirrors core indexing, status, query, and plugin behavior through core APIs. Core `codegraphy setup` now only prepares CodeGraphy's own user state and no longer configures MCP clients.

### Patch Changes

- [#215](https://github.com/joesobo/CodeGraphyV4/pull/215) [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512) Thanks [@joesobo](https://github.com/joesobo)! - Normalize plugin-declared file extensions case-insensitively and report async plugin CLI command failures through the CLI result output.

- [#215](https://github.com/joesobo/CodeGraphyV4/pull/215) [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512) Thanks [@joesobo](https://github.com/joesobo)! - Reject malformed Dart package imports that omit the package name.

## 0.2.1

### Patch Changes

- [#212](https://github.com/joesobo/CodeGraphyV4/pull/212) [`3263cc7`](https://github.com/joesobo/CodeGraphyV4/commit/3263cc70685e50d6bf6b30a161a435d88b45f000) Thanks [@joesobo](https://github.com/joesobo)! - Default symbol and variable graph scope node types to hidden for new workspaces.

## 0.2.0

### Minor Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Extract CodeGraphy's shared engine into `@codegraphy-dev/core`. Core now owns headless CodeGraphy Workspace indexing, File Discovery, Tree-sitter analysis, plugin execution, Graph Cache reads/writes, workspace freshness status, and Graph Query without depending on VS Code.

  The VS Code extension now acts as the visualization and editor adapter over core, and the public Plugin API is headless: VS Code-specific webview, command, decoration, and host bridge contracts stay inside the extension package.

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Plugins are installed at the user/tool level, discovered through the installed-plugin cache, enabled per CodeGraphy Workspace through the ordered `plugins` array, and configured with workspace-local `options`.

  Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.

### Patch Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Rebuild the `codegraphy` CLI and MCP server around path-first CodeGraphy Workspace commands backed by `@codegraphy-dev/core`. CLI and MCP indexing/query tools now default to the current folder or accept an explicit workspace path, and no longer need to open, select, or focus VS Code.

  Add matching CLI and MCP plugin commands for refreshing, adding, listing, enabling, and disabling CodeGraphy plugin packages.

- Updated dependencies [[`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4)]:
  - @codegraphy-dev/plugin-api@3.0.0
  - @codegraphy-dev/plugin-markdown@1.1.0
