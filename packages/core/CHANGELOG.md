# @codegraphy-dev/core

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
