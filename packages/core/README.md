# `@codegraphy-dev/core`

Shared CodeGraphy engine package for workspace indexing, Graph Cache access, plugin management, Graph Query behavior, and the terminal `codegraphy` command.

This package is the headless core used by the VS Code extension and CLI.

The published CLI currently supports Node.js 20 through 22; Node 22 LTS is recommended. Node 23 and newer require an upstream Tree-sitter native build that is not yet available to npm consumers.

The VS Code extension bundles this package for extension runtime behavior. Users install `@codegraphy-dev/core` globally only when they want terminal workflows such as Indexing, diagnostics, graph queries, Graph Scope and filter configuration, plugin registration, or workspace plugin enablement.

All `codegraphy ...` terminal commands live in this package. `codegraphy index` incrementally makes a workspace Graph Cache current and persists symbol analysis independently of Graph Scope, so later scope changes only affect projection and queries. Query commands use positional inputs and bounded defaults; Symbol Nodes are exposed through `nodes` and `search`, and `edges` is the single Relationship Graph primitive. Commands use the current directory unless the global `-C, --workspace <path>` option selects another workspace.

```bash
codegraphy index
codegraphy status
codegraphy doctor
codegraphy nodes
codegraphy search SettingsPanel
codegraphy edges
codegraphy dependencies src/app.ts
codegraphy dependents src/config.ts
codegraphy path src/app.ts src/config.ts
codegraphy scope
codegraphy scope node symbol:function on
codegraphy scope edge call on
codegraphy filter add '**/generated/**'
```

Run `codegraphy --help` for the full workflow and `codegraphy <command> --help` for purpose, arguments, effects, output, and examples. Data commands return `{"ok":true,"command":"...","data":...}` on stdout. Failures return `{"ok":false,"command":"...","error":{"code":"...","message":"..."}}` on stderr with a nonzero exit code. Indexing always chooses the cheapest safe full or incremental refresh; callers do not select an Indexing mode.

## Current Entry Points

- CodeGraphy Workspace paths: resolve `.codegraphy/settings.json` and `.codegraphy/graph.sqlite` for any folder path.
- Workspace Settings: read, normalize, write, and fingerprint workspace-local settings, including Graph Scope, filters, and ordered plugin entries without erasing extension-owned presentation settings.
- File Discovery: discover analyzable files and directories in any CodeGraphy Workspace without VS Code APIs.
- Built-in language analysis: parse supported languages and produce file, symbol, import, call, inherit, reference, and type-import relationships.
- File Analysis: run cache-aware per-file plugin analysis and project file relationships without VS Code APIs.
- Core Indexing: index an explicit CodeGraphy Workspace path, run headless plugins, build the Relationship Graph, and write the workspace Graph Cache.
- Workspace Analysis: orchestrate discovery, pre-analysis hooks, file analysis, cache updates, and graph rebuilds through headless dependencies.
- Graph Projection: build file, package, folder, and symbol Relationship Graph nodes and edges from analysis results.
- Plugin manifests: read `package.json#codegraphy` metadata without importing plugin runtime code.
- Plugin Registry: register, read, and write the user-level `~/.codegraphy/plugins.json` registry.
- Workspace plugin activity: enable or disable Plugin IDs by writing explicit `enabled: true` or `enabled: false` entries in the workspace-local `plugins` array.
- Graph Cache status: report whether a workspace-local Graph Cache exists without using VS Code APIs.
- Workspace status: report fresh, stale, or missing Graph Cache state with inspectable stale reasons.
- Graph Cache storage: load, save, clear, and inspect normalized File, Symbol, and Relation rows in the SQLite-backed Graph Cache at `<workspace-root>/.codegraphy/graph.sqlite`.
- Graph Query: search scoped Nodes, list scoped Edges, trace dependencies and dependents, and find bounded paths over Relationship Graph data plus persisted analysis metadata.

The core package exposes `indexCodeGraphyWorkspace` for explicit path-based Indexing. VS Code and CLI adapters call this package instead of owning independent indexing behavior.

## Built-In Language Coverage

Core ships baseline analysis for JavaScript, TypeScript, TSX, Python, Go, Haskell, Java, Kotlin, Lua, PHP, Ruby, Rust, Swift, Dart, C#, C, C++, Objective-C, Scala, and Pascal. Most of these languages use native Tree-sitter grammars. Pascal currently uses a core text-baseline analyzer so users still get unit `uses` relationships, inheritance relationships, and useful symbols without depending on a broken native grammar package.

## Plugin State Model

Plugin installation, global registration, and workspace enablement are separate:

- Installing the VS Code extension is enough for the base graph experience.
- Terminal plugin management starts with `npm install -g @codegraphy-dev/core`.
- Registered plugins live in the user-level Plugin Registry at `~/.codegraphy/plugins.json`.
- Workspace plugin activity lives in a CodeGraphy Workspace settings file at `<workspace-root>/.codegraphy/settings.json`.
- New workspaces materialize `codegraphy.markdown` as the first `enabled: true` plugin during first Indexing.
- The enabled plugin order is the order of `enabled: true` entries in the workspace `plugins` array.
- `plugins register <package>` records one globally installed package in the user-level Plugin Registry after validating its CodeGraphy plugin metadata.
- `plugins enable <plugin-id-or-package>` and `plugins disable <plugin-id-or-package>` target the selected workspace. By default this is the process current working directory; use the global `--workspace <path>` option to select another workspace. CodeGraphy does not walk upward to find a parent repo or existing `.codegraphy` folder.
- `plugins link <package-root>` records a local package checkout in the user-level Plugin Registry, which is the preferred private-plugin development path.
- Enabling or disabling a plugin changes workspace settings only; disabling persists `enabled: false` Plugin ID intent and keeps the runtime unloaded until the user enables that Plugin ID again.
- Indexing imports enabled npm plugin packages through their normal package `exports`, merges manifest `defaultOptions` with workspace-local `options`, delivers the result to package factories as `factoryOptions.options`, and delivers the same result to plugin lifecycle and analysis hooks as `context.options`.
- Package factories loaded for a concrete CodeGraphy Workspace also receive `factoryOptions.dataHost`, a plugin-owned persistence host bound to the plugin id returned by the factory.

Plugin npm packages identify themselves with package metadata:

```json
{
  "name": "@codegraphy-dev/plugin-vue",
  "version": "1.2.3",
  "codegraphy": {
    "type": "plugin",
    "apiVersion": "^3.0.0",
    "defaultOptions": {
      "includeTests": true
    },
    "disclosures": []
  }
}
```
