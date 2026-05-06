# @codegraphy-vscode/mcp

## 1.0.4

### Patch Changes

- Updated dependencies [[`73d0118`](https://github.com/joesobo/CodeGraphyV4/commit/73d0118012efc8709be3604b348628a6260b45c1)]:
  - @codegraphy-vscode/plugin-api@2.0.0

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

- [#189](https://github.com/joesobo/CodeGraphyV4/pull/189) [`9ef7d81`](https://github.com/joesobo/CodeGraphyV4/commit/9ef7d81925827a056b1b463446084abf91995c31) Thanks [@joesobo](https://github.com/joesobo)! - Replace the old MCP and CLI graph-cache lifecycle workflow with an open/index/query surface backed by the CodeGraphy Core Extension.

### Minor Changes

- [#185](https://github.com/joesobo/CodeGraphyV4/pull/185) [`d64701d`](https://github.com/joesobo/CodeGraphyV4/commit/d64701df5eefa3922651480b54417cf2cc9e5d90) Thanks [@joesobo](https://github.com/joesobo)! - Add the CodeGraphy MCP package and agent workflow for querying the Relationship Graph from Codex and other MCP-capable agents.

  The extension now exposes Core Extension Graph Query for agent use, including node, edge, relationship, symbol, and path reports. The MCP package opens or focuses the repo in VS Code, asks the Core Extension to run Indexing when needed, and forwards Graph Query requests instead of owning graph-cache reads itself.

### Patch Changes

- Updated dependencies [[`2f81974`](https://github.com/joesobo/CodeGraphyV4/commit/2f819740837de3f77b6717f4af3894e30e167e1f)]:
  - @codegraphy-vscode/plugin-api@1.2.0

## 0.1.0

- Add the first CodeGraphy CLI and MCP server for querying repo-local `.codegraphy/graph.lbug` data.
