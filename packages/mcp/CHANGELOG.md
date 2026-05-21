# @codegraphy-dev/mcp

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
