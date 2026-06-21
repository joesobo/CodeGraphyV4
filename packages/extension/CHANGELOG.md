# @codegraphy-dev/extension

## 5.11.1

### Patch Changes

- [#279](https://github.com/joesobo/CodeGraphyV4/pull/279) [`7b3ad30`](https://github.com/joesobo/CodeGraphyV4/commit/7b3ad30e1ca4f274752c42833dabf4229cace191) Thanks [@joesobo](https://github.com/joesobo)! - Show the CSS Snippets section in the Themes panel even when no snippets are configured.

- [#280](https://github.com/joesobo/CodeGraphyV4/pull/280) [`f27c9dd`](https://github.com/joesobo/CodeGraphyV4/commit/f27c9dd08f114a896056793bfd84c39a7f2b620f) Thanks [@joesobo](https://github.com/joesobo)! - Add a Themes panel input for adding CodeGraphy CSS snippet paths.

## 5.11.0

### Minor Changes

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096) Thanks [@joesobo](https://github.com/joesobo)! - Let active webview plugins own their own Graph View UI state.

  The extension now persists plugin-owned webview data under `pluginData` and replays it back to the matching plugin during Graph View startup and when a plugin is enabled. Plugin UI can restore workspace settings without becoming a first-class extension setting, and plugin-injected controls remain available only while their owning plugin is active.

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472) Thanks [@joesobo](https://github.com/joesobo)! - Add a Graph View world background slot for plugin-owned graph artwork.

  Plugins can now mount visual webview content behind the graph nodes and edges with `graph.stage.worldBackground`, while existing world and viewport overlay slots remain available for UI that should sit above the graph.

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f) Thanks [@joesobo](https://github.com/joesobo)! - Add ordered webview slot contributions for plugin-owned UI.

  Webview plugins can now call `api.registerSlotContribution(slot, { id, order, render })` to mount UI into named CodeGraphy slots. The host owns the contribution container, ordering, and cleanup, so plugin UI can use normal component structure without the extension needing to know what each plugin renders.

### Patch Changes

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`efa1d92`](https://github.com/joesobo/CodeGraphyV4/commit/efa1d92025aca06ea13efcbb11f98591d99abff3) Thanks [@joesobo](https://github.com/joesobo)! - Keep Theme and Plugins popup controls tidy for plugin-owned UI.

  The Theme popup now shows Legends, CSS Snippets, and plugin-injected sections as their own collapsible sections, with plugin-owned Theme controls ordered below CSS Snippets. The Plugins popup also collapses stale duplicate package rows so the Particles plugin appears as a single toggle.

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136) Thanks [@joesobo](https://github.com/joesobo)! - Dispose webview plugin work immediately when a plugin is disabled or its webview assets are reset.

  Webview plugin `activate(api)` functions can now return a cleanup function or `Disposable`. CodeGraphy calls that cleanup during plugin disable/reset so plugin-owned UI can stop timers, animation loops, message subscriptions, and injected DOM without waiting for a webview reload.

  The Particles plugin now uses that cleanup path to stop active background effects, clear its Theme controls, unsubscribe from plugin data updates, and remove its injected styles as soon as the plugin is disabled.

- Updated dependencies [[`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b)]:
  - @codegraphy-dev/core@1.6.1

## 5.10.0

### Minor Changes

- [#263](https://github.com/joesobo/CodeGraphyV4/pull/263) [`e7237bf`](https://github.com/joesobo/CodeGraphyV4/commit/e7237bf5e676bf20a0b5ca3445f5a597f072b64b) Thanks [@joesobo](https://github.com/joesobo)! - Upgrade C++ graph scope support with dedicated C++ symbol and variable node controls, include/call/inheritance/contains/override edges, and C++ example acceptance coverage.

- [#266](https://github.com/joesobo/CodeGraphyV4/pull/266) [`d3dfdea`](https://github.com/joesobo/CodeGraphyV4/commit/d3dfdea7193d15fa53009d1885b3d70ad6aff57d) Thanks [@joesobo](https://github.com/joesobo)! - Add CodeGraphy CSS Snippets for workspace-local UI customization.

  Create CSS files inside a CodeGraphy Workspace, such as `.codegraphy/snippets/base-grid.css`, then map them in `.codegraphy/settings.json` under `cssSnippets`. CodeGraphy loads paths set to `true`, keeps paths set to `false` disabled, removes stylesheets when paths are disabled or removed from settings, and keeps the paths workspace-local: absolute paths, parent traversal, non-CSS files, and missing files are skipped with `[CodeGraphy]` developer-console warnings when enabled.

  The extension UI now exposes stable `data-codegraphy-*` Styling Hooks across the graph view, graph stage, search, toolbar, panels, settings sections, timeline, indexing states, and plugin slots so snippets can target CodeGraphy surfaces without depending on generated classes or rebuilding a full VS Code theme. See `docs/SETTINGS.md` and `examples/css-snippets/` for usage plus static grid, forest, ocean, and faded image background demo snippets.

### Patch Changes

- [#264](https://github.com/joesobo/CodeGraphyV4/pull/264) [`b966fe4`](https://github.com/joesobo/CodeGraphyV4/commit/b966fe4ea4972e5c8061b69cfc47b74e8beec84c) Thanks [@joesobo](https://github.com/joesobo)! - Resolve production dependency advisories in shipped package dependency graphs.

- Updated dependencies [[`e7237bf`](https://github.com/joesobo/CodeGraphyV4/commit/e7237bf5e676bf20a0b5ca3445f5a597f072b64b)]:
  - @codegraphy-dev/core@1.6.0

## 5.9.0

### Minor Changes

- [#259](https://github.com/joesobo/CodeGraphyV4/pull/259) [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12) Thanks [@joesobo](https://github.com/joesobo)! - Hide impossible Graph Scope Node Type toggles for the current workspace.

  Graph Scope now uses active analyzer and plugin capabilities to decide which Symbol and Variable child toggles are relevant across every indexed file in the workspace. File, Folder, and Package stay visible as structural Node Types. Symbol and Variable are shown only when they have at least one relevant child toggle.

- [#254](https://github.com/joesobo/CodeGraphyV4/pull/254) [`b436e82`](https://github.com/joesobo/CodeGraphyV4/commit/b436e82fd64f3bb5bf425257a91ff9cece80f57b) Thanks [@joesobo](https://github.com/joesobo)! - Show the current workspace name as the Graph view title.

  The Graph view now shows the current workspace name in VS Code's view title, falling back to Graph when no workspace is open.

### Patch Changes

- [#257](https://github.com/joesobo/CodeGraphyV4/pull/257) [`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316) Thanks [@joesobo](https://github.com/joesobo)! - Refresh the C example workspace as a tiny logger with C-native include edges plus prototype, struct, union, enum, typedef, function, and global graph coverage. Include relationships now stay edge-only for C-family analysis, enabled symbols can remain visible as orphans until Contains is shown, variable child toggles now activate the Variable parent without also activating Symbol, and graph scope node toggle bursts now coalesce settings updates and graph redraws instead of lagging through every intermediate state.

- [#256](https://github.com/joesobo/CodeGraphyV4/pull/256) [`9e4e999`](https://github.com/joesobo/CodeGraphyV4/commit/9e4e999162886c990f2e1aeea49c3057dabd09a0) Thanks [@joesobo](https://github.com/joesobo)! - Add a JavaScript example workspace with acceptance coverage for imports, calls, and inheritance.

- [#258](https://github.com/joesobo/CodeGraphyV4/pull/258) [`20b9b40`](https://github.com/joesobo/CodeGraphyV4/commit/20b9b40e970f1fc15e3c0bdd7a72531ce8ca0844) Thanks [@joesobo](https://github.com/joesobo)! - Model Tree-sitter as core analysis instead of a plugin so hover and plugin UI metadata only show real plugin contributions.

- [#260](https://github.com/joesobo/CodeGraphyV4/pull/260) [`16be6af`](https://github.com/joesobo/CodeGraphyV4/commit/16be6afb9dc4d9ad6fe77c1ae992233c2e93537f) Thanks [@joesobo](https://github.com/joesobo)! - Fix Linux VSIX packaging so native Tree-sitter bindings are built and validated for the target platform instead of copying the release host's binary.

- Updated dependencies [[`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12), [`20b9b40`](https://github.com/joesobo/CodeGraphyV4/commit/20b9b40e970f1fc15e3c0bdd7a72531ce8ca0844)]:
  - @codegraphy-dev/core@1.5.0

## 5.8.0

### Minor Changes

- [#247](https://github.com/joesobo/CodeGraphyV4/pull/247) [`91e33a2`](https://github.com/joesobo/CodeGraphyV4/commit/91e33a219ab1c1db2069391525de0786921581fb) Thanks [@joesobo](https://github.com/joesobo)! - Bundle the new Objective-C and Scala native Tree-sitter runtimes with the VS Code extension.

  Users can open Objective-C, Scala, and Pascal workspaces in the extension and index them without installing separate language plugins. The extension package now vendors the Objective-C and Scala native grammar packages during build/VSIX packaging so language analysis works consistently across supported desktop platforms.

- [#251](https://github.com/joesobo/CodeGraphyV4/pull/251) [`1d9180c`](https://github.com/joesobo/CodeGraphyV4/commit/1d9180c29554c163e660a7c899c59755c4b0bdff) Thanks [@joesobo](https://github.com/joesobo)! - Add Graph Scope tooltips for Node Types and Edge Types, with optional plugin-provided descriptions and compact examples.

### Patch Changes

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886) Thanks [@joesobo](https://github.com/joesobo)! - Graph Scope now shows Edge Type controls from indexed workspace capabilities instead of every theoretical toggle or only currently observed edges. Relevant Edge Types can appear even when the latest graph has zero matching relationships, and CodeGraphy decides the relevant Edge Type list before Depth Mode, filters, search, or other view narrowing changes what is displayed. Edge Type controls stay visible but disabled until the workspace has a Graph Cache, and Graph Scope returns to Node Types if an unindexed workspace is opened while Edge Types was selected. Any existing Graph Cache enables Edge Type controls, even while Graph Cache Sync catches up.

  Source-language workspaces now surface Calls as a relevant Edge Type when their analyzer can emit imported-call relationships. C++ now emits Calls edges for calls to declarations in included headers, and the Godot plugin now emits Calls edges for `class_name` static method calls while keeping `load()` and `preload()` on the Loads edge.

  Plugins can declare core or plugin-owned Edge Type capabilities with `contributeEdgeTypeCapabilities(context)`. Plugin authors should use `context.filePaths` when a plugin supports multiple languages or file families with different Edge Types, so Graph Scope only shows toggles that are relevant to the indexed workspace.

- [#245](https://github.com/joesobo/CodeGraphyV4/pull/245) [`70096e8`](https://github.com/joesobo/CodeGraphyV4/commit/70096e81c526486781794be00c46ad7590a27922) Thanks [@joesobo](https://github.com/joesobo)! - Curve different edge types between the same nodes so every visible edge can be seen.

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2) Thanks [@joesobo](https://github.com/joesobo)! - Keep disabled plugins fully inactive across Graph View surfaces.

  When a workspace disables a plugin, CodeGraphy now excludes that plugin's graph analysis contributions, default filter groups, Graph Scope Node Type and Edge Type definitions, Edge Type capabilities, Graph View contribution statuses, toolbar/context/export actions, and webview assets. This keeps disabled plugins from leaving behind toggles or UI actions for features that are no longer active.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`4907fa2`](https://github.com/joesobo/CodeGraphyV4/commit/4907fa2b31c417f19045690526deb39877a82755) Thanks [@joesobo](https://github.com/joesobo)! - Keep disabled plugins unloaded during Core and VS Code extension indexing so disabled package, bundled Markdown, and provided plugin runtimes are not registered or run.

- [#252](https://github.com/joesobo/CodeGraphyV4/pull/252) [`c66210c`](https://github.com/joesobo/CodeGraphyV4/commit/c66210cae9cdf4ad6bb08e7c747b1a8116b134b0) Thanks [@joesobo](https://github.com/joesobo)! - Disable Graph Scope edge type controls until the workspace graph has been indexed.

- [#246](https://github.com/joesobo/CodeGraphyV4/pull/246) [`1d115c9`](https://github.com/joesobo/CodeGraphyV4/commit/1d115c9e95b85c169900d9059fb72e7c77780c63) Thanks [@joesobo](https://github.com/joesobo)! - Show hover popup connection counts for the currently visible edge types.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`f8787fa`](https://github.com/joesobo/CodeGraphyV4/commit/f8787fae1b40739301dfd784b2a6a1177acebfb7) Thanks [@joesobo](https://github.com/joesobo)! - Persist workspace plugin activity by Plugin ID with an explicit enabled state.

  New workspaces now write Markdown as an enabled plugin intent entry, and plugin toggles keep `enabled: false` entries when users disable a plugin. CodeGraphy uses the Plugin ID from static plugin metadata to resolve installed package runtimes, so disabled plugins keep their user intent and plugin-owned data without loading runtime code.

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`6917391`](https://github.com/joesobo/CodeGraphyV4/commit/69173916c7bd341296f23dcb11732746d273f805) Thanks [@joesobo](https://github.com/joesobo)! - Make plugin toggles use Plugin IDs as the workspace activity identity.

  The Plugins panel and Graph View settings now enable and disable plugins by the static Plugin ID, while package names stay as install metadata. Disabled plugins are written as explicit `enabled: false` workspace entries, enabled plugins are written as `enabled: true`, and default plugin options are looked up by Plugin ID with a package-name fallback for older installed-plugin records.

- [#252](https://github.com/joesobo/CodeGraphyV4/pull/252) [`24f2148`](https://github.com/joesobo/CodeGraphyV4/commit/24f2148f8744617f1f66307b467b4e4ae1df2dcb) Thanks [@joesobo](https://github.com/joesobo)! - Hide the Nests edge scope control until Folder Nodes are enabled, default Nests edges on for fresh workspaces, and stop drawing Nests edges from Package Nodes to files.

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561) Thanks [@joesobo](https://github.com/joesobo)! - Remove the unused Tests and Re-exports edge types from Graph Scope.

  Export-from relationships now appear as Imports instead of a separate Re-exports edge, so users have fewer duplicate-looking edge toggles to reason about.

- [#250](https://github.com/joesobo/CodeGraphyV4/pull/250) [`77503ee`](https://github.com/joesobo/CodeGraphyV4/commit/77503ee7b437924386fb86b4381847a6a16deb1c) Thanks [@joesobo](https://github.com/joesobo)! - Fix symbol-level graph scope behavior for inheritance, containment, overrides, and language example graphs.

- Updated dependencies [[`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2), [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886), [`91e33a2`](https://github.com/joesobo/CodeGraphyV4/commit/91e33a219ab1c1db2069391525de0786921581fb), [`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2), [`4907fa2`](https://github.com/joesobo/CodeGraphyV4/commit/4907fa2b31c417f19045690526deb39877a82755), [`0d558f0`](https://github.com/joesobo/CodeGraphyV4/commit/0d558f02e64760e9800fe40ab608eea6a73631fb), [`ac1cff8`](https://github.com/joesobo/CodeGraphyV4/commit/ac1cff8ded4ff8aed45ca3af5fa6028f3872e9c4), [`f8787fa`](https://github.com/joesobo/CodeGraphyV4/commit/f8787fae1b40739301dfd784b2a6a1177acebfb7), [`bc3e9c2`](https://github.com/joesobo/CodeGraphyV4/commit/bc3e9c2e6ef028832aa66458a29b4c54d02fe037), [`6917391`](https://github.com/joesobo/CodeGraphyV4/commit/69173916c7bd341296f23dcb11732746d273f805), [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561), [`77503ee`](https://github.com/joesobo/CodeGraphyV4/commit/77503ee7b437924386fb86b4381847a6a16deb1c)]:
  - @codegraphy-dev/core@1.4.0

## 5.7.0

### Minor Changes

- [#236](https://github.com/joesobo/CodeGraphyV4/pull/236) [`7ff7ef3`](https://github.com/joesobo/CodeGraphyV4/commit/7ff7ef3aaea18770ada9f6262c1dd7800ce0c151) Thanks [@joesobo](https://github.com/joesobo)! - Add Verbose Diagnostics for support and agent debugging.

  In the VS Code extension, Settings > Performance now includes a **Verbose Diagnostics** toggle. It is off by default and persists to `.codegraphy/settings.json` as `verboseDiagnostics`. When enabled, CodeGraphy writes factual `[CodeGraphy]` event lines to the VS Code Developer Tools console for extension activation, webview bootstrap, analysis requests, and Graph Cache load decisions.

  The Core CLI now accepts a global `--verbose` flag on every command. Verbose command diagnostics are written outside JSON stdout so status and query-style output remains parseable.

  Every MCP tool now accepts `verboseDiagnostics?: boolean`. When enabled, tool results include a `diagnostics` array with factual Core Package events such as workspace status reads, indexing phases, Graph Cache state, Graph Query execution, counts, and durations. Default MCP responses stay unchanged when diagnostics are disabled.

### Patch Changes

- [#237](https://github.com/joesobo/CodeGraphyV4/pull/237) [`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288) Thanks [@joesobo](https://github.com/joesobo)! - Fix Java graph relationships in the basic file view. The Java graph now counts the import and call from App.java to Helper.java as two connections collapsed into one visible edge, while superclass declarations no longer add an extra BaseService.java file connection.

- [#229](https://github.com/joesobo/CodeGraphyV4/pull/229) [`24312f0`](https://github.com/joesobo/CodeGraphyV4/commit/24312f0552cf59bbb0ba35f69a5628d22c776942) Thanks [@joesobo](https://github.com/joesobo)! - Add accessible Graph View labels for the stage, toolbar buttons, and indexing progress.

- [#237](https://github.com/joesobo/CodeGraphyV4/pull/237) [`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288) Thanks [@joesobo](https://github.com/joesobo)! - Restore Graph View context menus for background, file, folder, multi-file, symbol, edge, and canvas selections. Users can reliably right-click graph elements and see the expected actions with clear labels such as New File, Rename, Delete, Copy Path, Reveal in Explorer, and Fit All Nodes.

- [#240](https://github.com/joesobo/CodeGraphyV4/pull/240) [`40e80f2`](https://github.com/joesobo/CodeGraphyV4/commit/40e80f28e02efef479a12d3faa5916b2632deec2) Thanks [@joesobo](https://github.com/joesobo)! - Update CodeGraphy's generated `.gitignore` entry from `.codegraphy/` to `.codegraphy/*`.

  CodeGraphy still keeps generated workspace artifacts ignored by default, including Graph Cache files and imported assets, but the new contents-only ignore rule lets teams intentionally commit selected files under `.codegraphy/`. This matters for example projects and shared workspaces that want to version `.codegraphy/settings.json` so collaborators see the same plugin enablement, filters, Graph Scope, and Legend settings.

  Existing exact `.codegraphy` or `.codegraphy/` entries are migrated to `.codegraphy/*` the next time CodeGraphy initializes workspace settings, avoiding the Git behavior where ignoring a parent directory prevents later `!` exceptions from re-including files inside it.

- [#237](https://github.com/joesobo/CodeGraphyV4/pull/237) [`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288) Thanks [@joesobo](https://github.com/joesobo)! - Fix Graph View file actions opened from context menus. Create, rename, delete, reveal, copy path, filter, and legend actions now target the active workspace and show the expected prompts from the graph.

- [#242](https://github.com/joesobo/CodeGraphyV4/pull/242) [`90be7a4`](https://github.com/joesobo/CodeGraphyV4/commit/90be7a4f5bc144b1be0abe78c17dc13514514774) Thanks [@joesobo](https://github.com/joesobo)! - Add baseline Vue SFC plugin support so `.vue` script imports are indexed in workspace graphs.

- [#237](https://github.com/joesobo/CodeGraphyV4/pull/237) [`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288) Thanks [@joesobo](https://github.com/joesobo)! - Keep favorite toggles in sync in the Graph View. Favoriting or unfavoriting one or more nodes now updates immediately and stale refresh messages no longer undo the user's latest favorite selection.

- [#241](https://github.com/joesobo/CodeGraphyV4/pull/241) [`734e7a2`](https://github.com/joesobo/CodeGraphyV4/commit/734e7a258a5be1c2ef3dad8c710880ccaf87722a) Thanks [@joesobo](https://github.com/joesobo)! - Default fresh Graph Scope Edge Types to Imports on and other built-in edges off.

- [#243](https://github.com/joesobo/CodeGraphyV4/pull/243) [`9274dd2`](https://github.com/joesobo/CodeGraphyV4/commit/9274dd24ca42f3b2da7f696829145cc315adc372) Thanks [@joesobo](https://github.com/joesobo)! - Publish platform-specific VSIX artifacts for Linux x64, macOS Apple Silicon, and Windows x64 so installs load the matching LadybugDB native runtime.

- [#229](https://github.com/joesobo/CodeGraphyV4/pull/229) [`541538d`](https://github.com/joesobo/CodeGraphyV4/commit/541538de90645b4bf3f1d814e7c3889ed1391071) Thanks [@joesobo](https://github.com/joesobo)! - Keep graph nodes fixed where users drop them and improve graph accessibility labels for nodes and edges.

- [#237](https://github.com/joesobo/CodeGraphyV4/pull/237) [`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288) Thanks [@joesobo](https://github.com/joesobo)! - Improve Graph View accessibility targets for toolbar buttons, plugin toggles, nodes, and edges. These controls now expose stable labels so keyboard, screen-reader, and VS Code automation users can discover and operate graph controls more reliably.

- Updated dependencies [[`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288), [`7ff7ef3`](https://github.com/joesobo/CodeGraphyV4/commit/7ff7ef3aaea18770ada9f6262c1dd7800ce0c151)]:
  - @codegraphy-dev/core@1.3.0

## 5.6.5

### Patch Changes

- [#235](https://github.com/joesobo/CodeGraphyV4/pull/235) [`ad8f8af`](https://github.com/joesobo/CodeGraphyV4/commit/ad8f8af9c1bcd6cd950c7f248ef3d662ab0c019f) Thanks [@joesobo](https://github.com/joesobo)! - Make Indexing progress clearer by separating preparation from file analysis, replacing final cache-save progress with graph-view update progress, and hiding old graph stats until the indexed graph is published.

- [#235](https://github.com/joesobo/CodeGraphyV4/pull/235) [`f673e1f`](https://github.com/joesobo/CodeGraphyV4/commit/f673e1f83e28480da83337d15473bb7d143083cb) Thanks [@joesobo](https://github.com/joesobo)! - Keep discovered file nodes visible during cold-cache startup and label relationship counts as not indexed until a Graph Cache exists.

- [#235](https://github.com/joesobo/CodeGraphyV4/pull/235) [`c82e598`](https://github.com/joesobo/CodeGraphyV4/commit/c82e598a59349d9d3ff936627216baf518636800) Thanks [@joesobo](https://github.com/joesobo)! - Improve Graph Cache load and save responsiveness during startup and warm-cache graph replay.

- [#235](https://github.com/joesobo/CodeGraphyV4/pull/235) [`d99137e`](https://github.com/joesobo/CodeGraphyV4/commit/d99137ef968e158566e39d88f58c3012130232fd) Thanks [@joesobo](https://github.com/joesobo)! - Keep the graph view from staying on the startup loading screen while settings, filters, graph data, and plugin assets hydrate.

- Updated dependencies [[`ad8f8af`](https://github.com/joesobo/CodeGraphyV4/commit/ad8f8af9c1bcd6cd950c7f248ef3d662ab0c019f), [`c82e598`](https://github.com/joesobo/CodeGraphyV4/commit/c82e598a59349d9d3ff936627216baf518636800)]:
  - @codegraphy-dev/core@1.2.1

## 5.6.4

### Patch Changes

- [#222](https://github.com/joesobo/CodeGraphyV4/pull/222) [`da9c309`](https://github.com/joesobo/CodeGraphyV4/commit/da9c3096afcf962490c1d271c52e85c09ae2f6de) Thanks [@joesobo](https://github.com/joesobo)! - Deepen the Graph View runtime boundary so graph selection, renderer state, context-menu state, and render caches are exposed through named runtime facets.

- [#226](https://github.com/joesobo/CodeGraphyV4/pull/226) [`23c10c2`](https://github.com/joesobo/CodeGraphyV4/commit/23c10c24fc224b7d23036f08b84e0a617d1a80fe) Thanks [@joesobo](https://github.com/joesobo)! - Run Graph Context Menu actions against the selection that opened the menu and skip stale actions that no longer match that selection.

- [#224](https://github.com/joesobo/CodeGraphyV4/pull/224) [`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c) Thanks [@joesobo](https://github.com/joesobo)! - Keep Symbol-scoped Graph View payloads small by caching baseline file relationships first, lazily enriching Symbols and plugin analysis when those scopes are enabled, and reusing enriched cache tiers when they are toggled back on.

- [#224](https://github.com/joesobo/CodeGraphyV4/pull/224) [`8a95dc6`](https://github.com/joesobo/CodeGraphyV4/commit/8a95dc69ac170effc6ecb55dc64f1544555e4c13) Thanks [@joesobo](https://github.com/joesobo)! - Keep graph settings synced after webview reloads, keep registered package plugins visible in the plugin panel, and avoid reloading every plugin when toggling a package plugin.

- Updated dependencies [[`a2625ba`](https://github.com/joesobo/CodeGraphyV4/commit/a2625ba942287b43f939abfe5a5ca68f8e730680), [`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c)]:
  - @codegraphy-dev/core@1.2.0

## 5.6.3

### Patch Changes

- [#220](https://github.com/joesobo/CodeGraphyV4/pull/220) [`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5) Thanks [@joesobo](https://github.com/joesobo)! - Allow current Node 20 releases without workspace engine warnings.

- [#221](https://github.com/joesobo/CodeGraphyV4/pull/221) [`e8ba411`](https://github.com/joesobo/CodeGraphyV4/commit/e8ba411a45c5ec881a920f1787022d8e4b70ea52) Thanks [@joesobo](https://github.com/joesobo)! - Keep the cached graph visible during startup and plugin changes while Graph Cache sync runs in the background.

- Updated dependencies [[`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5)]:
  - @codegraphy-dev/core@1.1.2

## 5.6.2

### Patch Changes

- [#219](https://github.com/joesobo/CodeGraphyV4/pull/219) [`f531820`](https://github.com/joesobo/CodeGraphyV4/commit/f5318208b380a04b5e0f6ddcf3ebab7cd3641769) Thanks [@joesobo](https://github.com/joesobo)! - Keep workspace indexing responsive while rebuilding the Graph Cache from a missing or stale cache.

- Updated dependencies [[`f531820`](https://github.com/joesobo/CodeGraphyV4/commit/f5318208b380a04b5e0f6ddcf3ebab7cd3641769)]:
  - @codegraphy-dev/core@1.1.1

## 5.6.1

### Patch Changes

- [#218](https://github.com/joesobo/CodeGraphyV4/pull/218) [`9879f62`](https://github.com/joesobo/CodeGraphyV4/commit/9879f62e3bdef2f4dc18545d33acad72efdc9f61) Thanks [@joesobo](https://github.com/joesobo)! - Preserve the last good Graph Cache when a full index refresh is aborted and report the actual Graph Cache status after indexing so graph edges do not disappear after interrupted refreshes.

## 5.6.0

### Minor Changes

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b) Thanks [@joesobo](https://github.com/joesobo)! - Add the Extract Pro foundation: Access Provider contracts, plugin-owned data persistence delivered to package plugin factories, Graph View runtime/projection/context-menu/UI/force-adapter contribution contracts and hosts, and local plugin linking for private paid plugins.

  Graph View contribution callbacks receive live host context such as the current graph mode and timeline state.

### Patch Changes

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`582c514`](https://github.com/joesobo/CodeGraphyV4/commit/582c5140a3ffee19df917ce6f0796fd0f80d53e0) Thanks [@joesobo](https://github.com/joesobo)! - Add sized 2D rectangle node presentation so plugin nodes can render, pick, and collide at their expanded visual bounds.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`2b15c9c`](https://github.com/joesobo/CodeGraphyV4/commit/2b15c9c61c4d954554a4b979540b89a8ef595061) Thanks [@joesobo](https://github.com/joesobo)! - Expose graph mode and timeline state to Graph View context menu contributions so plugins can hide mode-specific actions.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`8b559dd`](https://github.com/joesobo/CodeGraphyV4/commit/8b559dd3204b87808dd1834fd2c00277d7f06d62) Thanks [@joesobo](https://github.com/joesobo)! - Expose live Graph View viewport node updates and per-node physics overrides so plugins can resize runtime nodes without restarting graph physics.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`e3c276d`](https://github.com/joesobo/CodeGraphyV4/commit/e3c276ddc5c520740fd2dabcaa79cccc787eafa8) Thanks [@joesobo](https://github.com/joesobo)! - Move pinned graph nodes smoothly during 2D drags and persist the updated pin only after drag end.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`310268c`](https://github.com/joesobo/CodeGraphyV4/commit/310268cb1bd3971fe715e3da6baff5da0788c30c) Thanks [@joesobo](https://github.com/joesobo)! - Re-send linked package plugin webview assets after workspace plugin loading so enabled plugins can activate their graph UI contributions.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`699e1a8`](https://github.com/joesobo/CodeGraphyV4/commit/699e1a8fe00d2fd6e91386a8ebb45c1704e3817c) Thanks [@joesobo](https://github.com/joesobo)! - Preserve plugin-owned workspace data when package plugins are toggled off.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`29b3b56`](https://github.com/joesobo/CodeGraphyV4/commit/29b3b56997ada2d30b1f252eeef104767c112e8b) Thanks [@joesobo](https://github.com/joesobo)! - Keep feature-specific Graph View nodes, context menu actions, and physics package-owned so disabling or removing a plugin removes those contributions from the graph.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`7781808`](https://github.com/joesobo/CodeGraphyV4/commit/77818086638d1b21c58e0eed9b9f3bc1faebfa1e) Thanks [@joesobo](https://github.com/joesobo)! - Hide internal built-in runtime plugins from the Plugins panel.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`c7a6ffc`](https://github.com/joesobo/CodeGraphyV4/commit/c7a6ffc1d271f1342139e0d7b79e6accb20cec7e) Thanks [@joesobo](https://github.com/joesobo)! - Allow graph plugins to request rounded corners for 2D rectangle nodes.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`e1210d6`](https://github.com/joesobo/CodeGraphyV4/commit/e1210d686254e7edddf5a0e489bd9a8e60a70abc) Thanks [@joesobo](https://github.com/joesobo)! - Clean up plugin-scoped Graph View viewport listeners when a plugin is removed or toggled off.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`c602e36`](https://github.com/joesobo/CodeGraphyV4/commit/c602e36a27e134530708d402dc1f904eda5c6cd1) Thanks [@joesobo](https://github.com/joesobo)! - Respect plugin runtime node fixed coordinates when building graph physics state.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`4fa5bce`](https://github.com/joesobo/CodeGraphyV4/commit/4fa5bcefedb5701e9db73d0e657fad015607479a) Thanks [@joesobo](https://github.com/joesobo)! - Keep package plugin toggles from re-running eager webview asset injection before the graph reload finishes and stop core-only Tree-sitter runtime lifecycle events from being logged as user-facing plugins.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`5d3ca1b`](https://github.com/joesobo/CodeGraphyV4/commit/5d3ca1bd02b201debb520a90fdc7214d8667701c) Thanks [@joesobo](https://github.com/joesobo)! - Keep plugin-owned layout saves from rebuilding the whole graph, and avoid file-info lookups for plugin runtime nodes.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`0be940f`](https://github.com/joesobo/CodeGraphyV4/commit/0be940fd52e17594f94fff436cc2d3b84c2b4c3a) Thanks [@joesobo](https://github.com/joesobo)! - Keep plugin node overlays from inheriting label fade opacity while zooming.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`c276081`](https://github.com/joesobo/CodeGraphyV4/commit/c276081a78ad290210ac667a0698d8ce87485edb) Thanks [@joesobo](https://github.com/joesobo)! - Keep package plugin rows stable across toggles, preserve plugin display names while disabled, remove obsolete plugin reordering controls, remove noisy runtime-availability subtext, and keep plugin-owned data saves from dropping graph settings.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`07ff638`](https://github.com/joesobo/CodeGraphyV4/commit/07ff638cdc127a455f5606c6205e78b2ac0d3761) Thanks [@joesobo](https://github.com/joesobo)! - Pass current graph physics settings to Graph View force adapters so feature plugins can match CodeGraphy's configured force behavior.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`a5f6df8`](https://github.com/joesobo/CodeGraphyV4/commit/a5f6df8b8ad5e89fddb43aaa77e0fc80e732f521) Thanks [@joesobo](https://github.com/joesobo)! - Fix package plugin toggles so Graph View contributions are added and removed immediately, add create-menu placement for plugin context menu actions, and keep plugin contribution snapshots stable while rendering the graph.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`0b4f0a8`](https://github.com/joesobo/CodeGraphyV4/commit/0b4f0a845f2e8e6fe1b26c97a7a3183a1d3b95eb) Thanks [@joesobo](https://github.com/joesobo)! - Keep plugin toggles from overlapping package reloads and keep refresh progress behind interactive graph popups.

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`265728a`](https://github.com/joesobo/CodeGraphyV4/commit/265728adb88828772fc9e8b8745aefc36bc55a08) Thanks [@joesobo](https://github.com/joesobo)! - Add plugin runtime node pointer areas so custom-shaped nodes can use graph-owned pointer picking.

- Updated dependencies [[`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b), [`005e4f5`](https://github.com/joesobo/CodeGraphyV4/commit/005e4f522b6295f6fbf068c79571f9182e963172), [`c276081`](https://github.com/joesobo/CodeGraphyV4/commit/c276081a78ad290210ac667a0698d8ce87485edb)]:
  - @codegraphy-dev/core@1.1.0

## 5.5.5

### Patch Changes

- Updated dependencies [[`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512), [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512), [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512)]:
  - @codegraphy-dev/core@1.0.0

## 5.5.4

### Patch Changes

- [#212](https://github.com/joesobo/CodeGraphyV4/pull/212) [`3263cc7`](https://github.com/joesobo/CodeGraphyV4/commit/3263cc70685e50d6bf6b30a161a435d88b45f000) Thanks [@joesobo](https://github.com/joesobo)! - Default symbol and variable graph scope node types to hidden for new workspaces.

- Updated dependencies [[`3263cc7`](https://github.com/joesobo/CodeGraphyV4/commit/3263cc70685e50d6bf6b30a161a435d88b45f000)]:
  - @codegraphy-dev/core@0.2.1

## 5.5.3

### Patch Changes

- [`e2112b7`](https://github.com/joesobo/CodeGraphyV4/commit/e2112b7609c28083bb60bd019ab7879838c072d9) Thanks [@joesobo](https://github.com/joesobo)! - Keep enabled symbol-kind nodes visible when graph visibility settings refresh after startup, and avoid rendering the initial graph until startup theme, settings, and plugin state are ready.

## 5.5.2

### Patch Changes

- [`5f6c0fb`](https://github.com/joesobo/CodeGraphyV4/commit/5f6c0fb6fc417adf7ff3371ed5f5a3e514bb6374) Thanks [@joesobo](https://github.com/joesobo)! - Keep graph edges rendered after reloading enabled npm plugins from the extension settings panel.

## 5.5.1

### Patch Changes

- [`43f6561`](https://github.com/joesobo/CodeGraphyV4/commit/43f656135eeae08beda9f6f4fc418964fc1d58b3) Thanks [@joesobo](https://github.com/joesobo)! - Rebuild stale Graph Cache data before publishing graph data so newly enabled npm plugins are not overwritten by cached analysis.

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
