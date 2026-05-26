# `@codegraphy-dev/core`

Shared CodeGraphy engine package for workspace indexing, Graph Cache access, plugin management, Graph Query behavior, and the terminal `codegraphy` command.

This package is the headless core used by the VS Code extension, MCP server, and CLI.

The VS Code extension bundles this package for extension runtime behavior. Users install `@codegraphy-dev/core` globally only when they want terminal workflows such as setup, Indexing, status, plugin discovery, or workspace plugin enablement.

The core CLI does not own MCP client configuration or MCP server startup. `codegraphy setup` prepares CodeGraphy's own user state, while `@codegraphy-dev/mcp` owns the optional agent-agnostic MCP server.

## Current Entry Points

- CodeGraphy Workspace paths: resolve `.codegraphy/settings.json` and `.codegraphy/graph.lbug` for any folder path.
- Workspace Settings: read, normalize, write, and fingerprint workspace-local settings, including ordered plugin entries.
- File Discovery: discover analyzable files and directories in any CodeGraphy Workspace without VS Code APIs.
- Tree-sitter Analysis: parse supported languages and produce file, symbol, import, call, inherit, reference, and type-import relationships.
- File Analysis: run cache-aware per-file plugin analysis and project file relationships without VS Code APIs.
- Core Indexing: index an explicit CodeGraphy Workspace path, run headless plugins, build the Relationship Graph, and write the workspace Graph Cache.
- Workspace Analysis: orchestrate discovery, pre-analysis hooks, file analysis, cache updates, and graph rebuilds through headless dependencies.
- Graph Projection: build file, package, folder, and symbol Relationship Graph nodes and edges from analysis results.
- Plugin manifests: read `package.json#codegraphy` metadata without importing plugin runtime code.
- Plugin Registry: register, read, and write the user-level `~/.codegraphy/plugins.json` registry.
- Workspace plugin enablement: enable or disable registered plugin packages by writing the workspace-local `plugins` array.
- Graph Cache status: report whether a workspace-local Graph Cache exists without using VS Code APIs.
- Workspace status: report fresh, stale, or missing Graph Cache state with inspectable stale reasons.
- Graph Cache storage: load, save, clear, and inspect the LadybugDB-backed Graph Cache at `<workspace-root>/.codegraphy/graph.lbug`.
- Graph Query: run node, edge, relationship, symbol, and path reports over Relationship Graph data plus persisted analysis metadata.

The core package now exposes `indexCodeGraphyWorkspace` for explicit path-based Indexing. VS Code, MCP, and CLI adapters should call this package instead of owning independent indexing behavior.

## Plugin State Model

Plugin installation and workspace enablement are separate:

- Installing the VS Code extension is enough for the base graph experience.
- Terminal plugin management starts with `npm install -g @codegraphy-dev/core`.
- Installed plugins live in the user-level cache at `~/.codegraphy/plugins.json`.
- Enabled plugins live in a CodeGraphy Workspace settings file at `<workspace-root>/.codegraphy/settings.json`.
- New workspaces materialize `@codegraphy-dev/plugin-markdown` as the first enabled plugin during first Indexing.
- The enabled plugin order is the order of the workspace `plugins` array.
- `plugins register <package>` records one globally installed package in the user-level Plugin Registry after validating its CodeGraphy plugin metadata.
- `plugins enable <package> [workspace]` and `plugins disable <package> [workspace]` take the workspace as an optional trailing positional argument. With no workspace path, they target the process current working directory and do not walk upward to find a parent repo or existing `.codegraphy` folder.
- Enabling or disabling a plugin changes workspace settings only; plugin runtime loading still waits for explicit Indexing so users can batch several plugin changes before rebuilding the Graph Cache.
- Indexing imports enabled npm plugin packages through their normal package `exports`, merges manifest `defaultOptions` with workspace-local `options`, and delivers the result to plugin lifecycle and analysis hooks as `context.options`.

Plugin npm packages identify themselves with package metadata:

```json
{
  "name": "@codegraphy-dev/plugin-python",
  "version": "1.2.3",
  "codegraphy": {
    "type": "plugin",
    "apiVersion": "^2.0.0",
    "defaultOptions": {
      "includeTests": true
    },
    "disclosures": []
  }
}
```
