# `@codegraphy-dev/core`

Shared CodeGraphy engine package for workspace indexing, Graph Cache access, plugin management, Graph Query behavior, and the terminal `codegraphy` command.

This package is the headless core used by the VS Code extension and CLI.

The published CLI currently supports Node.js 20 through 22; Node 22 LTS is recommended. Node 23 and newer require an upstream Tree-sitter native build that is not yet available to npm consumers.

The VS Code extension bundles this package for extension runtime behavior. Users install `@codegraphy-dev/core` globally only when they want terminal workflows such as Indexing, diagnostics, graph queries, Graph Scope and filter configuration, plugin registration, or workspace plugin enablement.

All `codegraphy ...` terminal commands live in this package. `codegraphy index` incrementally makes a workspace Graph Cache current, reports structured file-budget truncation with an exact recovery command, and persists the complete Relationship Graph independently of Graph Scope. `codegraphy watch` performs initial synchronization and then debounces create, update, delete, rename, Git ignore, and settings events into serialized incremental updates; it skips cache artifacts and active Filter matches, coordinates simultaneous cache writers, emits JSON Lines lifecycle records, and flushes pending work on shutdown. Active Filters gate query results and reusable analysis facts consistently. Changing `respectGitignore` invalidates Index freshness and rebuilds discovery so newly ignored facts are pruned and newly eligible files can be analyzed. `settings get/set/unset` safely reads or mutates validated workspace settings, reports Indexing impact from the setting that changed, and refuses to overwrite corrupt JSON or unsupported settings versions. `search` merges exact live source, cached AST Symbol, and indexed Node evidence, then uses deterministic all-term File ranking when a natural multi-term phrase has few literal matches. `map` combines independent task terms, selected declarations, and personalized graph ranking into a bounded File map with typed connecting Relationships. `query` inspects one exact File path or Symbol Node ID and returns prioritized declarations plus incoming and outgoing Relationships. Exact targeted queries use the complete cached graph by default, independently of saved Graph View Scope, while explicit `--filter`, `--node-type`, or `--edge-type` projections constrain Nodes, cached Symbols, source evidence, and Relationships consistently. JavaScript-family reexports are indexed explicitly, allowing call Relationships to resolve through barrels to implementation Symbols. The narrower `nodes`, `edges`, `dependencies`, `dependents`, and `path` commands continue or enumerate the graph. Graph navigation accepts repeatable, comma-separated `--filter`, `--node-type`, and `--edge-type` options for one invocation without changing workspace settings. Commands use the current directory unless the global `-C, --workspace <path>` option selects another workspace.

```bash
codegraphy settings get maxFiles
codegraphy settings set maxFiles 2500
codegraphy index
codegraphy watch
codegraphy status
codegraphy doctor
codegraphy nodes
codegraphy search SettingsPanel
codegraphy search 'Indexing *workspace*'
codegraphy map 'settings corruption during filtering'
codegraphy query src/cli/index/command.ts
codegraphy edges
codegraphy dependencies src/app.ts
codegraphy dependents src/config.ts
codegraphy path src/app.ts src/config.ts
codegraphy scope
codegraphy scope node symbol:function on
codegraphy scope edge call on
codegraphy filter add '**/generated/**'
```

Run `codegraphy --help` for the full workflow and `codegraphy <command> --help` for purpose, arguments, effects, output, and examples. Data commands return `{"ok":true,"command":"...","data":...}` on stdout. Failures return `{"ok":false,"command":"...","error":{"code":"...","message":"..."}}` on stderr with a nonzero exit code. An unhealthy `doctor` result keeps all completed checks in `error.details`. Indexing always chooses the cheapest safe full or incremental refresh; callers do not select an Indexing mode.

## Current Entry Points

- CodeGraphy Workspace paths: resolve `.codegraphy/settings.json` and `.codegraphy/graph.sqlite` for any folder path.
- Workspace Settings: strictly validate persisted known fields, safely read or mutate them through the CLI, and preserve unknown extension fields without replacing corrupt input with defaults.
- File Discovery: discover analyzable files and directories, apply active custom/plugin/Git filters before the eligible-file budget, and report cache-retention paths without VS Code APIs.
- Built-in language analysis: parse supported languages and produce file, symbol, import, reexport, call, inherit, reference, and type-import relationships.
- File Analysis: run cache-aware per-file plugin analysis and project file relationships without VS Code APIs.
- Core Indexing: index an explicit CodeGraphy Workspace path, run headless plugins, build the Relationship Graph, and write the workspace Graph Cache.
- Live Update: debounce native workspace events, retain changes during active Indexing, prevent superseded analysis from overwriting newer facts, and update the Graph Cache through one serialized workspace engine.
- Workspace Analysis: orchestrate discovery, pre-analysis hooks, file analysis, cache updates, and graph rebuilds through headless dependencies.
- Graph Projection: build file, package, folder, and symbol Relationship Graph nodes and edges from analysis results.
- Plugin manifests: read `package.json#codegraphy` metadata without importing plugin runtime code.
- Plugin Registry: register, read, and write the user-level `~/.codegraphy/plugins.json` registry.
- Workspace plugin activity: inherit, enable, or disable Plugin IDs through each workspace-local plugin entry's `activation` value. Inherited entries use the global plugin default.
- Graph Cache status: report whether a workspace-local Graph Cache exists without using VS Code APIs.
- Workspace status: report fresh, stale, or missing Graph Cache state with inspectable stale reasons.
- Graph Cache storage: load, save, clear, and inspect normalized File, Node, Symbol, and Edge rows in the SQLite-backed Graph Cache at `<workspace-root>/.codegraphy/graph.sqlite`.
- Workspace Search: merge bounded exact evidence with deterministic all-term File fallback candidates for natural multi-term phrases.
- Task Map: rank task-relevant Files from live terms and cached Relationships, with selected declarations and typed connections.
- Target Query: inspect one exact File or Symbol with prioritized declarations and bounded Relationships.
- Graph Query: list scoped Nodes and Edges, then use complete cached types by default for exact targeted relationships and bounded paths unless an invocation explicitly projects Node or Edge Types.

The core package exposes `indexCodeGraphyWorkspace` for one-shot Indexing and composes `createCodeGraphyWorkspaceCacheUpdater` with `subscribeCodeGraphyWorkspaceChanges` for the explicit foreground CLI watcher. The VS Code Extension uses Core only after an explicit Index or Re-index Workspace action; it does not subscribe to source-file changes.

## Built-In Language Coverage

Core ships baseline analysis for JavaScript, TypeScript, TSX, Python, Go, Haskell, Java, Kotlin, Lua, PHP, Ruby, Rust, Swift, Dart, C#, C, C++, Objective-C, Scala, and Pascal. Most of these languages use native Tree-sitter grammars. Pascal currently uses a core text-baseline analyzer so users still get unit `uses` relationships, inheritance relationships, and useful symbols without depending on a broken native grammar package.

## Plugin State Model

Plugin installation, global registration, and workspace enablement are separate:

- Installing the VS Code extension is enough for the base graph experience.
- Terminal plugin management starts with `npm install -g @codegraphy-dev/core`.
- Registered plugins live in the user-level Plugin Registry at `~/.codegraphy/plugins.json`.
- Workspace plugin activity lives in a CodeGraphy Workspace settings file at `<workspace-root>/.codegraphy/settings.json`.
- New workspaces materialize `codegraphy.markdown` with `activation: "inherit"` during first Indexing. Its bundled global default enables it.
- `plugins register <package>` records one globally installed package in the user-level Plugin Registry after validating its CodeGraphy plugin metadata.
- `plugins enable <plugin-id-or-package>` and `plugins disable <plugin-id-or-package>` target the selected workspace. Add `--global` to change the global default. Use `plugins inherit <plugin-id-or-package>` to remove a workspace override. By default the selected workspace is the process current working directory; use the global `--workspace <path>` option to select another workspace. CodeGraphy does not walk upward to find a parent repo or existing `.codegraphy` folder.
- `plugins link <package-root>` records a local package checkout in the user-level Plugin Registry, which is the preferred private-plugin development path.
- A workspace enable or disable command persists `activation: "enabled"` or `activation: "disabled"` for that Plugin ID. An inherited entry follows the global default.
- Indexing imports each active Core plugin through its descriptor `entry`. It merges descriptor `data.defaultOptions` with workspace-local `options`. Workspace values win. Package factories receive the result as `factoryOptions.options`; lifecycle and analysis hooks receive it as `context.options`.
- Package factories loaded for a concrete CodeGraphy Workspace also receive `factoryOptions.dataHost`, a persistence host bound to the plugin descriptor ID before the factory runs.

Plugin npm packages identify themselves with package metadata:

```json
{
  "name": "@codegraphy-dev/plugin-vue",
  "version": "1.2.3",
  "codegraphy": {
    "plugins": [{
      "id": "codegraphy.vue",
      "host": "core",
      "entry": "./dist/plugin.js",
      "apiVersion": "^4.0.0",
      "data": {
        "defaultOptions": {
          "includeTests": true
        },
        "updateImpact": {
          "toggle": "reanalyze-plugin-files",
          "defaultSetting": "reanalyze-plugin-files"
        }
      }
    }]
  }
}
```
