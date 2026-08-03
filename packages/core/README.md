# `@codegraphy-dev/core`

Shared CodeGraphy engine package for workspace indexing, Graph Cache access, plugin management, Graph Query behavior, and the terminal `codegraphy` command.

This package is the headless core used by the VS Code extension and CLI.

The published CLI supports Node.js `^22.14.0 || >=23.6.0`. An active Long-Term Support release is recommended.

The VS Code extension bundles this package for extension runtime behavior. Users install `@codegraphy-dev/core` globally only when they want terminal workflows such as Indexing, diagnostics, graph queries, Graph Scope and filter configuration, plugin registration, or workspace plugin enablement.

## Quick start

Commands target the current directory. Put `-C, --workspace <path>` before the command to select another folder; CodeGraphy never searches parent directories for a workspace.

```bash
cd /path/to/workspace
codegraphy index
codegraphy search SettingsPanel
codegraphy query src/settingsPanel/view.tsx
codegraphy dependencies src/settingsPanel/view.tsx
```

Indexing chooses the cheapest safe full or incremental refresh and persists the complete Relationship Graph independently of Graph Scope. If discovery reaches `maxFiles`, the result reports the total found and an exact settings command to raise the budget.

## Explore the graph

| Command | Purpose |
|---|---|
| `search <pattern>` | Merge exact live source, cached AST Symbols, and indexed Nodes; sparse natural phrases add deterministic all-term File candidates. |
| `map <task>` | Return a bounded task-personalized File map with matched terms, selected declarations, and typed connecting Relationships. |
| `query <node>` | Inspect one exact File path or Symbol ID with prioritized declarations and incoming/outgoing Relationships. |
| `nodes`, `edges` | Page through the shaped graph inventory. |
| `dependencies`, `dependents` | Read outgoing or incoming Relationships for an exact target. |
| `path <from> <to>` | Find bounded directed routes between exact targets. |

`nodes` and `edges` use saved Graph Scope. Search, Map, Target Query, Path, and targeted Relationship commands read complete cached types by default. Repeatable, comma-separated `--filter`, `--node-type`, and `--edge-type` options narrow one command without changing workspace settings. Core stores JavaScript and TypeScript reexports as explicit Relationships so calls through barrels can resolve to implementation Symbols.

## Maintain a workspace

```bash
codegraphy status
codegraphy doctor
codegraphy settings get maxFiles
codegraphy settings set maxFiles 2500
codegraphy filter add '**/generated/**'
codegraphy scope node symbol:function on
codegraphy index
```

Settings reads and mutations validate known fields and preserve unknown fields. They refuse to overwrite malformed JSON or unsupported settings versions and report whether Indexing is required. Adding an active Filter narrows queries immediately; removing or disabling one can expose files that were never indexed and therefore requires another Index. Changing discovery settings such as `respectGitignore` also invalidates Index freshness.

## Keep the cache current

`codegraphy watch` is an optional foreground process for long-running terminal sessions. It synchronizes first, then batches create, update, delete, rename, Git ignore, and settings events into serialized updates. It skips cache artifacts and active Filter matches, coordinates simultaneous writers, retains changes that arrive during active work, and flushes pending work on shutdown. Full and incremental updates verify discovery and source inputs under writer ownership before replacing cached facts; a corrupt cache encountered during an incremental update is rebuilt completely under the same ownership. The VS Code Extension does not start this process.

## Output contract

Data commands return `{"ok":true,"command":"...","data":...}` on stdout. Failures return `{"ok":false,"command":"...","error":{"code":"...","message":"..."}}` on stderr with a nonzero exit code. Watch emits one JSON envelope per line. An unhealthy `doctor` result keeps completed checks in `error.details`; `--verbose` adds diagnostics to stderr.

Run `codegraphy --help` for the command list and `codegraphy <command> --help` for arguments, bounds, effects, and examples.

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
- Workspace Search: merge bounded exact evidence with deterministic all-term File fallback candidates for natural multi-term phrases, limiting source extraction to 1 MiB per file and streaming freshness hashes for oversized files.
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
