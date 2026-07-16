# @codegraphy-dev/mcp

## 2.2.8

### Patch Changes

- Updated dependencies [[`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974), [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e)]:
  - @codegraphy-dev/core@2.0.0

## 2.2.7

### Patch Changes

- Updated dependencies [[`e3e7e61`](https://github.com/joesobo/CodeGraphyV4/commit/e3e7e6166fce6d72b2117a36a9eb1510562fb6b7)]:
  - @codegraphy-dev/core@1.7.2

## 2.2.6

### Patch Changes

- Updated dependencies [[`e950612`](https://github.com/joesobo/CodeGraphyV4/commit/e95061239ab63fc3c5e64ec8b653db7466271979), [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f), [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/core@1.7.1

## 2.2.5

### Patch Changes

- Updated dependencies [[`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc), [`7a62728`](https://github.com/joesobo/CodeGraphyV4/commit/7a627280ab37ad4a1152b6e681c5cb8fcf1a928e), [`2e11809`](https://github.com/joesobo/CodeGraphyV4/commit/2e11809bd5d3983436b25c0916a01499f025aa7e), [`b435b28`](https://github.com/joesobo/CodeGraphyV4/commit/b435b28121c3f0202999dd99dc074ec146ea2006), [`83da5b6`](https://github.com/joesobo/CodeGraphyV4/commit/83da5b6b609535061c236b6b25869f3be985fc58), [`b63fe4f`](https://github.com/joesobo/CodeGraphyV4/commit/b63fe4f685e0d64deeadd838d730035926f9803a), [`3924f42`](https://github.com/joesobo/CodeGraphyV4/commit/3924f4210b1915dea5c203d4d07bb4d0e485e41b), [`2e33507`](https://github.com/joesobo/CodeGraphyV4/commit/2e33507c086487bf92a44cf24e787cd9a8158910)]:
  - @codegraphy-dev/core@1.7.0

## 2.2.4

### Patch Changes

- [#270](https://github.com/joesobo/CodeGraphyV4/pull/270) [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b) Thanks [@joesobo](https://github.com/joesobo)! - Allow current and future Node releases while keeping Node 20 as the minimum supported runtime.

- Updated dependencies [[`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b)]:
  - @codegraphy-dev/core@1.6.1

## 2.2.3

### Patch Changes

- [#264](https://github.com/joesobo/CodeGraphyV4/pull/264) [`b966fe4`](https://github.com/joesobo/CodeGraphyV4/commit/b966fe4ea4972e5c8061b69cfc47b74e8beec84c) Thanks [@joesobo](https://github.com/joesobo)! - Resolve production dependency advisories in shipped package dependency graphs.

- Updated dependencies [[`e7237bf`](https://github.com/joesobo/CodeGraphyV4/commit/e7237bf5e676bf20a0b5ca3445f5a597f072b64b)]:
  - @codegraphy-dev/core@1.6.0

## 2.2.2

### Patch Changes

- Updated dependencies [[`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12), [`20b9b40`](https://github.com/joesobo/CodeGraphyV4/commit/20b9b40e970f1fc15e3c0bdd7a72531ce8ca0844)]:
  - @codegraphy-dev/core@1.5.0

## 2.2.1

### Patch Changes

- [#253](https://github.com/joesobo/CodeGraphyV4/pull/253) [`bc3e9c2`](https://github.com/joesobo/CodeGraphyV4/commit/bc3e9c2e6ef028832aa66458a29b4c54d02fe037) Thanks [@joesobo](https://github.com/joesobo)! - Make CLI, MCP, and workspace status output use Plugin ID activity.

  `codegraphy plugins enable` and `codegraphy plugins disable` now resolve package-name input to the static Plugin ID before writing workspace settings, list enabled plugins by Plugin ID, and keep disabled plugins as `enabled: false` intent instead of removing them. Workspace status reports enabled Plugin IDs, example settings use the same `id` plus `enabled` shape, and MCP enable and disable tools now accept `pluginId` so agents use the same workspace activity identity as Core.

  Plugin registration and linking now require package plugins to declare their static Plugin ID in `codegraphy.json`, and Core rejects package runtimes whose returned `plugin.id` does not match that static ID.

- Updated dependencies [[`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2), [`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886), [`91e33a2`](https://github.com/joesobo/CodeGraphyV4/commit/91e33a219ab1c1db2069391525de0786921581fb), [`1ee64a3`](https://github.com/joesobo/CodeGraphyV4/commit/1ee64a30c4f6a5b9588a29ae499c2c1a23ef79b2), [`4907fa2`](https://github.com/joesobo/CodeGraphyV4/commit/4907fa2b31c417f19045690526deb39877a82755), [`0d558f0`](https://github.com/joesobo/CodeGraphyV4/commit/0d558f02e64760e9800fe40ab608eea6a73631fb), [`ac1cff8`](https://github.com/joesobo/CodeGraphyV4/commit/ac1cff8ded4ff8aed45ca3af5fa6028f3872e9c4), [`f8787fa`](https://github.com/joesobo/CodeGraphyV4/commit/f8787fae1b40739301dfd784b2a6a1177acebfb7), [`bc3e9c2`](https://github.com/joesobo/CodeGraphyV4/commit/bc3e9c2e6ef028832aa66458a29b4c54d02fe037), [`6917391`](https://github.com/joesobo/CodeGraphyV4/commit/69173916c7bd341296f23dcb11732746d273f805), [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561), [`77503ee`](https://github.com/joesobo/CodeGraphyV4/commit/77503ee7b437924386fb86b4381847a6a16deb1c)]:
  - @codegraphy-dev/core@1.4.0

## 2.2.0

### Minor Changes

- [#236](https://github.com/joesobo/CodeGraphyV4/pull/236) [`7ff7ef3`](https://github.com/joesobo/CodeGraphyV4/commit/7ff7ef3aaea18770ada9f6262c1dd7800ce0c151) Thanks [@joesobo](https://github.com/joesobo)! - Add Verbose Diagnostics for support and agent debugging.

  In the VS Code extension, Settings > Performance now includes a **Verbose Diagnostics** toggle. It is off by default and persists to `.codegraphy/settings.json` as `verboseDiagnostics`. When enabled, CodeGraphy writes factual `[CodeGraphy]` event lines to the VS Code Developer Tools console for extension activation, webview bootstrap, analysis requests, and Graph Cache load decisions.

  The Core CLI now accepts a global `--verbose` flag on every command. Verbose command diagnostics are written outside JSON stdout so status and query-style output remains parseable.

  Every MCP tool now accepts `verboseDiagnostics?: boolean`. When enabled, tool results include a `diagnostics` array with factual Core Package events such as workspace status reads, indexing phases, Graph Cache state, Graph Query execution, counts, and durations. Default MCP responses stay unchanged when diagnostics are disabled.

### Patch Changes

- Updated dependencies [[`9c30a29`](https://github.com/joesobo/CodeGraphyV4/commit/9c30a293d00338be08a70dcc912bb0520cf00288), [`7ff7ef3`](https://github.com/joesobo/CodeGraphyV4/commit/7ff7ef3aaea18770ada9f6262c1dd7800ce0c151)]:
  - @codegraphy-dev/core@1.3.0

## 2.1.4

### Patch Changes

- Updated dependencies [[`ad8f8af`](https://github.com/joesobo/CodeGraphyV4/commit/ad8f8af9c1bcd6cd950c7f248ef3d662ab0c019f), [`c82e598`](https://github.com/joesobo/CodeGraphyV4/commit/c82e598a59349d9d3ff936627216baf518636800)]:
  - @codegraphy-dev/core@1.2.1

## 2.1.3

### Patch Changes

- Updated dependencies [[`a2625ba`](https://github.com/joesobo/CodeGraphyV4/commit/a2625ba942287b43f939abfe5a5ca68f8e730680), [`feac4c1`](https://github.com/joesobo/CodeGraphyV4/commit/feac4c15fb7b6555c1ae5d6d2655a7b6debc7f4c)]:
  - @codegraphy-dev/core@1.2.0

## 2.1.2

### Patch Changes

- [#220](https://github.com/joesobo/CodeGraphyV4/pull/220) [`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5) Thanks [@joesobo](https://github.com/joesobo)! - Allow current Node 20 releases without workspace engine warnings.

- Updated dependencies [[`f67a8b0`](https://github.com/joesobo/CodeGraphyV4/commit/f67a8b0bf4ce20ba9e69699610ad05042caae7a5)]:
  - @codegraphy-dev/core@1.1.2

## 2.1.1

### Patch Changes

- Updated dependencies [[`f531820`](https://github.com/joesobo/CodeGraphyV4/commit/f5318208b380a04b5e0f6ddcf3ebab7cd3641769)]:
  - @codegraphy-dev/core@1.1.1

## 2.1.0

### Minor Changes

- [#209](https://github.com/joesobo/CodeGraphyV4/pull/209) [`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b) Thanks [@joesobo](https://github.com/joesobo)! - Add the Extract Pro foundation: Access Provider contracts, plugin-owned data persistence delivered to package plugin factories, Graph View runtime/projection/context-menu/UI/force-adapter contribution contracts and hosts, and local plugin linking for private paid plugins.

  Graph View contribution callbacks receive live host context such as the current graph mode and timeline state.

### Patch Changes

- Updated dependencies [[`b9ffd7d`](https://github.com/joesobo/CodeGraphyV4/commit/b9ffd7d57f844071473049ba3bfa1a6ac5af667b), [`005e4f5`](https://github.com/joesobo/CodeGraphyV4/commit/005e4f522b6295f6fbf068c79571f9182e963172), [`c276081`](https://github.com/joesobo/CodeGraphyV4/commit/c276081a78ad290210ac667a0698d8ce87485edb)]:
  - @codegraphy-dev/core@1.1.0

## 2.0.0

### Major Changes

- [#215](https://github.com/joesobo/CodeGraphyV4/pull/215) [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512) Thanks [@joesobo](https://github.com/joesobo)! - Move the canonical `codegraphy` CLI into `@codegraphy-dev/core`. Plugin packages now use an explicit `codegraphy plugins register <package>` step before workspace-local enablement, and refresh-style plugin scanning has been removed from the supported flow.

  The MCP package now publishes only the agent-facing `codegraphy-mcp` server command and mirrors core indexing, status, query, and plugin behavior through core APIs. Core `codegraphy setup` now only prepares CodeGraphy's own user state and no longer configures MCP clients.

### Patch Changes

- Updated dependencies [[`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512), [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512), [`3955c78`](https://github.com/joesobo/CodeGraphyV4/commit/3955c7860cfc95ca03924df9698b0254649b3512)]:
  - @codegraphy-dev/core@1.0.0

## 1.1.1

### Patch Changes

- Updated dependencies [[`3263cc7`](https://github.com/joesobo/CodeGraphyV4/commit/3263cc70685e50d6bf6b30a161a435d88b45f000)]:
  - @codegraphy-dev/core@0.2.1

## 1.1.0

### Minor Changes

- [#208](https://github.com/joesobo/CodeGraphyV4/pull/208) [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738) Thanks [@joesobo](https://github.com/joesobo)! - Rebuild the `codegraphy` CLI and MCP server around path-first CodeGraphy Workspace commands backed by `@codegraphy-dev/core`. CLI and MCP indexing/query tools now default to the current folder or accept an explicit workspace path, and no longer need to open, select, or focus VS Code.

  Add matching CLI and MCP plugin commands for refreshing, adding, listing, enabling, and disabling CodeGraphy plugin packages.

- [#204](https://github.com/joesobo/CodeGraphyV4/pull/204) [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4) Thanks [@joesobo](https://github.com/joesobo)! - Add Symbol and Variable nodes to the Relationship Graph with Graph Scope controls, `contains` and `overrides` edges, scoped Legend defaults, symbol-aware exports, and richer Graph Query/MCP symbol payloads.

  Default node Legend entries now use singular labels, keep their colors directly editable, and rely on Custom Legend Entries for overrides instead of separate color-enable toggles. Core symbol defaults stay intentionally broad; language-specific symbol kinds fall back to Symbol styling unless a plugin contributes its own defaults. The plugin API now documents symbol endpoint projection for `fromSymbolId` and `toSymbolId`, and the Godot plugin emits `class_name`, function, constant, variable, and enum declarations as symbol nodes. Symbol hover cards now show the symbol name, containing file, symbol type, and graph connection counts directly from the visible graph.

### Patch Changes

- Updated dependencies [[`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`f310e22`](https://github.com/joesobo/CodeGraphyV4/commit/f310e2249f53f7de54270e396199d24230b03738), [`d11c9ad`](https://github.com/joesobo/CodeGraphyV4/commit/d11c9ad5fdb93a4c3837c67180f392bb698a66f4)]:
  - @codegraphy-dev/core@0.2.0
  - @codegraphy-dev/plugin-api@3.0.0

## 1.0.4

### Patch Changes

- Updated dependencies [[`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1)]:
  - @codegraphy-dev/plugin-api@2.0.0

## 1.0.3

### Patch Changes

- [#196](https://github.com/joesobo/CodeGraphyV4/pull/196) [`8fd9ac7`](https://github.com/joesobo/CodeGraphyV4/commit/8fd9ac73eba6071482415de53aae25be798cfd7b) Thanks [@joesobo](https://github.com/joesobo)! - Retry partial Core Extension response-file reads during indexing.

## 1.0.2

### Patch Changes

- [#195](https://github.com/joesobo/CodeGraphyV4/pull/195) [`abdc884`](https://github.com/joesobo/CodeGraphyV4/commit/abdc884d1e75b9072a67e57625e9d1487b8c2056) Thanks [@joesobo](https://github.com/joesobo)! - Ignore Turbo cache churn during graph refresh and show CLI indexing wait feedback.

## 1.0.1

### Patch Changes

- Rebuild the CLI bundle before publishing the MCP package so global installs include the `codegraphy` executable.

## 1.0.0

### Major Changes

- [#189](https://github.com/joesobo/CodeGraphyV4/pull/189) [`9ef7d81`](https://github.com/joesobo/CodeGraphyV4/commit/9ef7d81925827a056b1b463446084abf91995c31) Thanks [@joesobo](https://github.com/joesobo)! - Replace the old MCP and CLI graph-cache lifecycle workflow with the original open/index/query surface that was backed by the VS Code extension-host bridge.

### Minor Changes

- [#185](https://github.com/joesobo/CodeGraphyV4/pull/185) [`d64701d`](https://github.com/joesobo/CodeGraphyV4/commit/d64701df5eefa3922651480b54417cf2cc9e5d90) Thanks [@joesobo](https://github.com/joesobo)! - Add the CodeGraphy MCP package and agent workflow for querying the Relationship Graph from Codex and other MCP-capable agents.

  At the time, the extension exposed Graph Query for agent use, including node, edge, relationship, symbol, and path reports. That design asked VS Code to open or focus the repo before indexing/querying; newer releases run MCP and CLI indexing/querying through `@codegraphy-dev/core` without opening or focusing VS Code.

### Patch Changes

- Updated dependencies [[`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f)]:
  - @codegraphy-dev/plugin-api@1.2.0

## 0.1.0

- Add the first CodeGraphy CLI and MCP server for querying repo-local `.codegraphy/graph.lbug` data.
