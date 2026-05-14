# `@codegraphy/core`

Shared CodeGraphy engine package for workspace indexing, Graph Cache access, and Graph Query behavior.

This package is the headless core that the VS Code extension, MCP server, and CLI will share as the core extraction runbook moves behavior out of the extension package.

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
- Installed plugin cache: refresh, add, read, and write the user-level `~/.codegraphy/plugins.json` cache.
- Workspace plugin enablement: enable or disable cached plugin packages by writing the workspace-local `plugins` array.
- Graph Cache status: report whether a workspace-local Graph Cache exists without using VS Code APIs.
- Workspace status: report fresh, stale, or missing Graph Cache state with inspectable stale reasons.
- Graph Cache storage: load, save, clear, and inspect the LadybugDB-backed Graph Cache at `<workspace-root>/.codegraphy/graph.lbug`.
- Graph Query: run node, edge, relationship, symbol, and path reports over Relationship Graph data plus persisted analysis metadata.

The core package now exposes `indexCodeGraphyWorkspace` for explicit path-based Indexing. VS Code, MCP, and CLI adapters should call this package instead of owning independent indexing behavior.

## Plugin State Model

Plugin installation and workspace enablement are separate:

- Installed plugins live in the user-level cache at `~/.codegraphy/plugins.json`.
- Enabled plugins live in a CodeGraphy Workspace settings file at `<workspace-root>/.codegraphy/settings.json`.
- New workspaces materialize `@codegraphy/plugin-markdown` as the first enabled plugin during first Indexing.
- The enabled plugin order is the order of the workspace `plugins` array.
- `plugins refresh` scans global npm roots for `@codegraphy/*` packages with CodeGraphy plugin metadata.
- `plugins add <package>` records an explicitly named globally installed package, including non-`@codegraphy` packages.
- Enabling or disabling a plugin changes workspace settings only; plugin runtime loading still waits for explicit Indexing.

Plugin npm packages identify themselves with package metadata:

```json
{
  "name": "@codegraphy/plugin-python",
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
