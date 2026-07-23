# @codegraphy-dev/core

## 4.0.0

### Major Changes

- [#317](https://github.com/joesobo/CodeGraphyV4/pull/317) [`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa) Thanks [@joesobo](https://github.com/joesobo)! - Use one global and workspace plugin activation model for every runtime host.
  Keep Core plugins headless, move VS Code Extension contracts to the Extension
  Plugin API, and load active host-specific plugins only when that host opens.

  Remove rendering fields and persisted view state from Core graph data. Let each
  interface own its rendering and preserve optional interface data through the
  open workspace `interfaces` list.

  Ship Godot and Unity as dual-host packages. Their Core entries own analysis and
  semantic graph types. Their Extension entries own Graph View Legend colors,
  shapes, and icons.

### Minor Changes

- [`7ecf8fd`](https://github.com/joesobo/CodeGraphyV4/commit/7ecf8fd0488aa7dcf0dc84e512de19f83ab323f2) Thanks [@joesobo](https://github.com/joesobo)! - - Make CLI help self-contained for agents. Return exclusive success or error envelopes, resumable pagination, bounded-path completeness, and one-off Filter, Node Type, and Edge Type projections with semantic parent, descendant, and overlapping Node Type matches.
  - Store file state and complete semantic graph facts in compact `File`, `Node`, `Symbol`, and `Edge` SQLite tables. Preserve file modification times for fast cache reuse and enforce foreign keys. Interfaces own view state outside the Graph Cache.
  - Index Nodes, Symbols, and Edges once regardless of Graph Scope. Extend doctor with cache metadata, integrity, foreign-key health, and record counts, keep a new index fresh when configured Plugins are unavailable, and persist the complete extension graph.
  - Prevent binary files from reaching analyzers. Skip binary sampling I/O for known text formats.

### Patch Changes

- Updated dependencies [[`7ecf8fd`](https://github.com/joesobo/CodeGraphyV4/commit/7ecf8fd0488aa7dcf0dc84e512de19f83ab323f2), [`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa)]:
  - @codegraphy-dev/plugin-markdown@1.1.11
  - @codegraphy-dev/plugin-api@7.0.0

## 3.0.0

### Major Changes

- [#312](https://github.com/joesobo/CodeGraphyV4/pull/312) [`1384c5d`](https://github.com/joesobo/CodeGraphyV4/commit/1384c5d8ff9c22fb9b283c937d4bbb45ca7cac44) Thanks [@joesobo](https://github.com/joesobo)! - Simplify workspace selection around the current directory and one global `-C, --workspace <path>` option. Remove trailing workspace arguments and the redundant `setup` command.

### Minor Changes

- [#312](https://github.com/joesobo/CodeGraphyV4/pull/312) [`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962) Thanks [@joesobo](https://github.com/joesobo)! - Query the saved Graph Scope with concise positional `nodes`, `search`, `edges`, `dependencies`, `dependents`, and `path` commands. Symbol Nodes include their source metadata without requiring a separate symbols command.

- [#312](https://github.com/joesobo/CodeGraphyV4/pull/312) [`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962) Thanks [@joesobo](https://github.com/joesobo)! - Make repeated workspace Indexing reuse unchanged file analysis while giving plugins the changed files and lightweight workspace inventory needed for safe invalidation.

- [#312](https://github.com/joesobo/CodeGraphyV4/pull/312) [`1384c5d`](https://github.com/joesobo/CodeGraphyV4/commit/1384c5d8ff9c22fb9b283c937d4bbb45ca7cac44) Thanks [@joesobo](https://github.com/joesobo)! - Inspect and update workspace Graph Scope, filters, plugin state, and local health from the CLI while sharing `.codegraphy/settings.json` safely with the VS Code extension.

### Patch Changes

- [#312](https://github.com/joesobo/CodeGraphyV4/pull/312) [`e2db569`](https://github.com/joesobo/CodeGraphyV4/commit/e2db569e0044ff5d656c6a11c7979cab3d6f7121) Thanks [@joesobo](https://github.com/joesobo)! - Add strict CLI argument errors, command-scoped help, version output, compact status JSON, and clearer Indexing progress.

- [#312](https://github.com/joesobo/CodeGraphyV4/pull/312) [`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962) Thanks [@joesobo](https://github.com/joesobo)! - Store workspace Graph Caches in portable SQLite files and bundle the matching native runtime in each supported VS Code extension build.

- Updated dependencies [[`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962)]:
  - @codegraphy-dev/plugin-api@6.1.0
  - @codegraphy-dev/plugin-markdown@1.1.10

## 2.0.0

### Major Changes

- Advance the host runtime compatibility protocol to Plugin API 3. Plugins must declare `apiVersion: '^3.0.0'`; plugins targeting the removed v2 contracts are rejected before registration.

- [#308](https://github.com/joesobo/CodeGraphyV4/pull/308) [`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974) Thanks [@joesobo](https://github.com/joesobo)! - CodeGraphy now provides one supported 2D Relationship Graph and removes the 3D graph mode, its toolbar toggle, 3D node shapes, 3D camera state, and Three.js renderer settings. Existing workspaces open directly in the 2D graph; saved 3D preferences are ignored.

This is a breaking Plugin API change. Plugin authors must remove `GraphNodeShape3D`, `shape3D`, `graphMode`, three-dimensional node coordinates (`z`, `fz`, and `vz`), and 3D values in selected-node position payloads. Graph View contributions, drag callbacks, context-menu selectors, and viewport adapters now receive only two-dimensional graph state. The Unity plugin continues to contribute Unity graph data but no longer supplies 3D presentation metadata.

- [#308](https://github.com/joesobo/CodeGraphyV4/pull/308) [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e) Thanks [@joesobo](https://github.com/joesobo)! - CodeGraphy now opens one current-workspace Relationship Graph and removes the Timeline panel, commit-by-commit Graph Revision playback, revision controls, and Git-history Churn node sizing. Existing workspaces keep their current graph settings, but saved Timeline state and Churn sizing selections no longer affect the graph. Choose Connections or File Size for semantic node sizing.

This is a breaking Plugin API and Core package change. Plugin authors must remove the `timeline-panel` slot, Timeline lifecycle events and payloads, `timelineActive` contribution/context fields, Timeline analysis mode and `commitSha`, and the optional `churn` graph-node field. Core callers must stop passing churn counts into graph construction. Plugins should analyze the current CodeGraphy Workspace and contribute to the normal Graph View instead of branching on Timeline state.

### Patch Changes

- Updated dependencies [[`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974), [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e)]:
  - @codegraphy-dev/plugin-api@6.0.0
  - @codegraphy-dev/plugin-markdown@1.1.9

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

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now loads plugin-owned and Symbol evidence into memory when the user enables the matching Graph Scope or plugin. If Graph Cache contains the evidence, the first toggle uses 1 cache read, 0 analysis jobs, and 0 cache saves. Later off/on toggles reuse memory without more cache reads.

In the current `main` versus PR monorepo benchmark, the change reduced baseline serialized runtime cache size from 18,583,676 bytes to 10,781,465 bytes. The result uses 7,802,211 fewer bytes, a 41.98% reduction, and is 1.72 times smaller. It also keeps retained Symbol facts at 0 until the user enables Symbol scope; the previous startup retained 11,631 hidden facts.

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

- [#290](https://github.com/joesobo/CodeGraphyV4/pull/290) [`3924f42`](https://github.com/joesobo/CodeGraphyV4/commit/3924f4210b1915dea5c203d4d07bb4d0e485e41b) Thanks [@joesobo](https://github.com/joesobo)! - Add initial Unity plugin support for scenes and prefabs. The plugin creates GameObject and Component graph Symbols with Unity Graph Scope defaults and file-to-GameObject-to-Component containment. It also adds icon-backed Unity file themes, default filters for generated files, and Unity-sourced reference Edges for scripts and prefab instances.

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

- [#257](https://github.com/joesobo/CodeGraphyV4/pull/257) [`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316) Thanks [@joesobo](https://github.com/joesobo)! - Refresh the C example workspace as a small logger with C-native include Edges and coverage for prototypes, structs, unions, enums, typedefs, functions, and globals. C-family Include Relationships now remain Edges without duplicate Nodes. Active Symbols can remain visible as orphans until Graph Scope shows Contains. Variable child toggles activate the Variable parent without activating Symbol. Graph Scope combines bursts of Node toggles into one settings update and graph redraw.

- [#258](https://github.com/joesobo/CodeGraphyV4/pull/258) [`20b9b40`](https://github.com/joesobo/CodeGraphyV4/commit/20b9b40e970f1fc15e3c0bdd7a72531ce8ca0844) Thanks [@joesobo](https://github.com/joesobo)! - Model Tree-sitter as core analysis instead of a plugin so hover and plugin UI metadata only show real plugin contributions.

- Updated dependencies [[`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12)]:
  - @codegraphy-dev/plugin-api@5.0.0
  - @codegraphy-dev/plugin-markdown@1.1.5

## 1.4.0

### Minor Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886) Thanks [@joesobo](https://github.com/joesobo)! - Graph Scope now derives Edge Type controls from indexed workspace capabilities. Relevant Edge Types can appear when the graph has no matching Relationships. CodeGraphy derives the list before Depth Mode, filters, search, or other view rules narrow the display. Controls remain visible but disabled until the workspace has a Graph Cache. Graph Scope returns to Node Types when a user opens an unindexed workspace with Edge Types selected. Any Graph Cache enables the controls while Graph Cache Sync updates it.

Source-language workspaces now surface Calls as a relevant Edge Type when their analyzer can emit imported-call relationships. C++ now emits Calls edges for calls to declarations in included headers, and the Godot plugin now emits Calls edges for `class_name` static method calls while keeping `load()` and `preload()` on the Loads edge.

Plugins can declare core or plugin-owned Edge Type capabilities with `contributeEdgeTypeCapabilities(context)`. Plugin authors should use `context.filePaths` when a plugin supports multiple languages or file families with different Edge Types, so Graph Scope only shows toggles that are relevant to the indexed workspace.

- [#247](https://github.com/joesobo/CodeGraphyV4/pull/247) [`91e33a2`](https://github.com/joesobo/CodeGraphyV4/commit/91e33a219ab1c1db2069391525de0786921581fb) Thanks [@joesobo](https://github.com/joesobo)! - Add core language coverage for Objective-C, Scala, and Pascal workspaces.

Objective-C and Scala use native Tree-sitter grammars. Users get File Nodes, local and imported File Relationships, resolved inheritance, and Symbol Nodes for classes, protocols, traits, objects, enums, type aliases, and methods. Core uses a text-baseline analyzer for Pascal because `tree-sitter-pascal` lacks a usable native binding. Users still get Pascal unit `uses` Relationships, class inheritance, and Symbols for classes, records, interfaces, and procedures.

### Patch Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2) Thanks [@joesobo](https://github.com/joesobo)! - Stop attributing unmatched C function calls to the only included header.

C Call Edges now point to an included header when the analyzer finds a matching function declaration there. Local helper calls and unresolved calls no longer create misleading File-to-header Call Edges based on an unrelated include.

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2) Thanks [@joesobo](https://github.com/joesobo)! - Keep disabled plugins fully inactive across Graph View surfaces.

When a workspace disables a plugin, CodeGraphy now removes that plugin's graph analysis, default filter groups, Graph Scope definitions and capabilities, Graph View status, actions, and webview assets. Disabled plugins no longer leave inactive toggles or UI actions behind.

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

The Plugins panel and Graph View settings now use the static Plugin ID to change activity. Package names remain installation metadata. CodeGraphy writes explicit `enabled: false` or `enabled: true` workspace entries. It finds default options by Plugin ID and falls back to the package name for older registry records.

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

The Core CLI now accepts a global `--verbose` flag on each command. It writes verbose diagnostics outside JSON stdout so status and query output remains parseable.

Each MCP tool now accepts `verboseDiagnostics?: boolean`. Enable it to add a `diagnostics` array with Core Package events, including workspace status reads, indexing phases, Graph Cache state, Graph Query execution, counts, and durations. Disabled diagnostics preserve the default MCP response.

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

- [#224](https://github.com/joesobo/CodeGraphyV4/pull/224) [`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c) Thanks [@joesobo](https://github.com/joesobo)! - Keep Symbol-scoped Graph View payloads small by caching baseline File Relationships first. Load Symbols and plugin analysis when the user enables those scopes, then reuse enriched cache tiers after later toggles.

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

- [#215](https://github.com/joesobo/CodeGraphyV4/pull/215) [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512) Thanks [@joesobo](https://github.com/joesobo)! - Move the canonical `codegraphy` CLI into `@codegraphy-dev/core`. Plugin packages now require `codegraphy plugins register <package>` before workspace enablement. Remove refresh-style plugin scanning from the supported flow.

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

The VS Code extension now connects headless Core to visualization and editor features. The extension package keeps VS Code-specific webview, command, decoration, and host bridge contracts out of the public Plugin API.

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Move CodeGraphy language plugins to headless npm packages under the `@codegraphy-dev/*` scope. Users install plugins at the user or tool level. CodeGraphy finds them through the installed-plugin cache, enables them per CodeGraphy Workspace through the ordered `plugins` array, and applies workspace-local `options`.

Markdown is now a real plugin package installed with core and enabled by default for newly indexed CodeGraphy Workspaces. Godot analysis now demonstrates structured plugin analysis by using external GDScript and Godot resource parsers while preserving text fallbacks.

### Patch Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Rebuild the `codegraphy` CLI and MCP server around path-first CodeGraphy Workspace commands backed by `@codegraphy-dev/core`. CLI and MCP indexing/query tools now default to the current folder or accept an explicit workspace path, and no longer need to open, select, or focus VS Code.

Add matching CLI and MCP plugin commands for refreshing, adding, listing, enabling, and disabling CodeGraphy plugin packages.

- Updated dependencies [[`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4)]:
  - @codegraphy-dev/plugin-api@3.0.0
  - @codegraphy-dev/plugin-markdown@1.1.0
