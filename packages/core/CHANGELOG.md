# @codegraphy-dev/core

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
