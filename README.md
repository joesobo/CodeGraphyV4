<p align="center">
  <img src="./assets/icon.png" alt="CodeGraphy icon" width="120" />
</p>

<h1 align="center">CodeGraphy</h1>

<p align="center">
An interactive VS Code Relationship Graph for exploring how files and code concepts connect.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy"><img src="https://img.shields.io/visual-studio-marketplace/v/codegraphy.codegraphy?label=extension" alt="VS Code Marketplace version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy"><img src="https://img.shields.io/visual-studio-marketplace/i/codegraphy.codegraphy?label=installs" alt="VS Code Marketplace installs" /></a>
  <a href="https://www.npmjs.com/package/@codegraphy-dev/core"><img src="https://img.shields.io/npm/v/%40codegraphy-dev%2Fcore?label=core%20CLI" alt="Core CLI version" /></a>
  <a href="https://www.npmjs.com/package/@codegraphy-dev/plugin-api"><img src="https://img.shields.io/npm/v/%40codegraphy-dev%2Fplugin-api?label=plugin%20API" alt="Plugin API version" /></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy">Install</a>
·
  <a href="./docs/README.md">Docs</a>
·
  <a href="./docs/PLUGINS.md">Build a plugin</a>
·
  <a href="./CONTRIBUTING.md">Contribute</a>
·
  <a href="https://trello.com/b/wG65Lfrb/codegraphy">Roadmap</a>
</p>

CodeGraphy indexes a folder and projects its files and declarations into Nodes. It renders imports, calls, references, inheritance, containment, tests, and plugin-defined Relationships as an interactive graph inside VS Code. Search, Graph Scope, and persistent filters narrow the view. The same Core engine supports the extension, terminal CLI, and agent queries.

![CodeGraphy Relationship Graph interaction demo](./docs/media/readme/relationship-graph-demo.gif)

## Features

| Capability | What it provides |
|---|---|
| Relationship Graph | File, folder, package, Symbol, and plugin-defined Nodes connected by typed Edges. |
| Search and filters | Temporary search plus workspace-local include and exclude rules. |
| Graph Scope | One panel for Node Type and Edge Type visibility. |
| Symbol Nodes | Functions, classes, interfaces, types, variables, constants, and language-specific declarations. |
| Minimap | A live overview of the current Visible Graph with pointer and keyboard panning. |
| Theming | VS Code theme integration, Material Icon Theme file shapes, Legend Entries, and workspace CSS Snippets. |
| Large-graph renderer | Custom WebGPU drawing with deterministic WebAssembly force and collision physics. |
| Graph actions | Open, reveal, create, rename, delete, favorite, filter, and export from the graph. |
| Graph Cache | Workspace-local SQLite storage shared by the extension and CLI. |
| Plugins | Headless npm packages for deeper analysis and Graph View contributions. |
| Agent access | Bounded JSON queries through the Core CLI and a reusable Agent Skill source. |

## Gallery

| Large workspace |
|:--:|
| ![CodeGraphy rendering a large workspace graph](./docs/media/readme/large-workspace-demo.gif) |

| Search and filters | Symbol Nodes |
|:--:|:--:|
| ![Search and filter controls](./docs/media/readme/search-filter-panel.png) | ![Relationship Graph with Symbol Nodes](./docs/media/readme/symbol-nodes-graph.png) |

## Install

### VS Code Extension

1. Install [CodeGraphy from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
2. Open a folder or workspace.
3. Open CodeGraphy from the Activity Bar.
4. Select **Index Workspace** to add semantic Relationships to the initial file graph.

The extension publishes native runtime targets for Linux x64, macOS Apple Silicon, and Windows x64. It bundles Core plus baseline analysis for JavaScript, TypeScript, TSX, Python, Go, Haskell, Java, Kotlin, Lua, PHP, Ruby, Rust, Swift, Dart, C#, C, C++, Objective-C, Scala, and Pascal. Markdown analysis ships as a bundled plugin that starts enabled in new workspaces.

### CLI and Plugins

The terminal CLI supports Node.js 20 through 22. Node 22 LTS is recommended.

```bash
npm install -g @codegraphy-dev/core
codegraphy index
codegraphy search SettingsPanel
codegraphy dependencies packages/extension/src/webview/app/shell/view.tsx
```

Install, register, and enable optional plugins separately:

```bash
npm install -g @codegraphy-dev/plugin-vue
codegraphy plugins register @codegraphy-dev/plugin-vue
codegraphy plugins enable @codegraphy-dev/plugin-vue
codegraphy index
```

Commands target the current directory. Use `-C, --workspace <path>` before the command to select another CodeGraphy Workspace:

```bash
codegraphy -C /path/to/workspace index
```

## CLI Reference

All `codegraphy ...` commands are published by `@codegraphy-dev/core`. Data commands return a stable JSON envelope on stdout. Failures return the same envelope shape on stderr and use a nonzero exit code. An unhealthy `doctor` result also includes `data` with every completed check, beside the standard `error` field. Help and version output stay plain text.

| Command | Result |
|---|---|
| `codegraphy status` | Reports fresh, stale, missing, or unusable Graph Cache state. |
| `codegraphy doctor` | Checks runtime, settings, Graph Cache, and plugin state. |
| `codegraphy index` | Makes the selected workspace Graph Cache current. |
| `codegraphy nodes` | Lists bounded Nodes from saved Graph Scope. |
| `codegraphy search <text>` | Searches Nodes. |
| `codegraphy edges` | Lists bounded Edges. |
| `codegraphy dependencies <node>` | Lists outgoing Relationships for a file or exact Symbol Node. |
| `codegraphy dependents <node>` | Lists incoming Relationships for a file or exact Symbol Node. |
| `codegraphy path <from> <to>` | Finds bounded directed paths. |
| `codegraphy scope` | Reads or changes saved Node Type and Edge Type scope. |
| `codegraphy filter` | Reads or changes persisted filter patterns. |
| `codegraphy plugins` | Registers, links, lists, enables, or disables plugins. |

Run `codegraphy <command> --help` for exact arguments. Query, settings, Indexing, and diagnostic commands keep machine-readable JSON on stdout. Verbose diagnostics go to stderr.

### Agent Skill

The [CodeGraphy Agent Skill](./skills/codegraphy/SKILL.md) teaches shell-capable agents to keep the index current and choose a bounded Graph Query before reading source. Install it from a clone of this repo:

```bash
npx skills@latest add ./skills/codegraphy
```

A public `codegraphy/skills` repository will host the skill once published.

## Architecture

![CodeGraphy package and data flow](./docs/media/readme/codegraphy-architecture.png)

`@codegraphy-dev/core` owns File Discovery, built-in analysis, plugin processing, SQLite Graph Cache storage, Graph Query, and the CLI. The VS Code extension connects Core to the editor lifecycle and React Graph View. `@codegraphy-dev/graph-renderer` owns WebGPU drawing and WebAssembly physics. Headless plugins communicate through `@codegraphy-dev/plugin-api` contracts.

| Package | Role |
|---|---|
| [`@codegraphy-dev/core`](./packages/core/README.md) | Shared indexing, cache, plugin, query, and CLI engine. |
| [`@codegraphy-dev/extension`](./packages/extension/docs/README.md) | VS Code host and Graph View product integration. |
| [`@codegraphy-dev/graph-renderer`](./packages/graph-renderer/README.md) | WebGPU graph renderer and WebAssembly physics. |
| [`@codegraphy-dev/plugin-api`](./packages/plugin-api/README.md) | Public TypeScript contracts for plugins. |
| `@codegraphy-dev/plugin-*` | Optional language, framework, Unity, and visual plugins. |
| [`@codegraphy/web`](./apps/web/README.md) | Account, subscription, billing, and access routes. |

The editable diagram source is [`docs/media/readme/codegraphy-architecture.excalidraw`](./docs/media/readme/codegraphy-architecture.excalidraw).

## Development

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm run test
pnpm run lint
pnpm run typecheck
```

See [Contributing](./CONTRIBUTING.md) for the workflow and [Documentation](./docs/README.md) for the reference map. The active roadmap lives on [Trello](https://trello.com/b/wG65Lfrb/codegraphy).

## License

MIT
