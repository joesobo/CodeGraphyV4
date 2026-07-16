<p align="center">
  <img src="./assets/icon.png" alt="CodeGraphy icon" width="120" />
</p>

<h1 align="center">CodeGraphy</h1>

<p align="center">
  A VS Code Relationship Graph for understanding how files and codebase concepts connect.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy"><img src="https://img.shields.io/badge/core%20extension-5.4.0-0b7285" alt="Core extension version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy"><img src="https://img.shields.io/badge/install-VS%20Code%20Marketplace-0078d4" alt="Install from the VS Code Marketplace" /></a>
  <a href="https://www.npmjs.com/package/@codegraphy-dev/plugin-api"><img src="https://img.shields.io/npm/v/%40codegraphy-dev%2Fplugin-api?label=plugin%20api" alt="Plugin API version" /></a>
  <a href="https://trello.com/b/wG65Lfrb/codegraphy"><img src="https://img.shields.io/badge/roadmap-Trello-0052cc" alt="Trello roadmap" /></a>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy">VS Code Extension</a>
  ·
  <a href="https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript">TypeScript/JavaScript Plugin</a>
  ·
  <a href="https://www.npmjs.com/package/@codegraphy-dev/plugin-godot">Godot Plugin</a>
  ·
  <a href="https://www.npmjs.com/package/@codegraphy-dev/plugin-vue">Vue Plugin</a>
  ·
  <a href="https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte">Svelte Plugin</a>
  ·
  <a href="./skills/codegraphy/SKILL.md">Agent Skill</a>
  ·
  <a href="https://www.npmjs.com/package/@codegraphy-dev/plugin-api">Plugin API</a>
  ·
  <a href="https://www.npmjs.com/package/@codegraphy-dev/graph-renderer">Graph Renderer</a>
</p>

CodeGraphy turns a folder into an interactive Relationship Graph inside VS Code. It starts with File Nodes, then Indexing adds richer Edges from imports, references, calls, tests, folder/package structure, and plugin-provided analysis. The goal is simple: make the relationships between files visible enough that people and agents can navigate a CodeGraphy Workspace without guessing.

This repo is a work in progress and is being built through agentic engineering. It should be useful, but the public surface is still evolving.

![CodeGraphy relationship graph with VS Code theme colors and Material Icon Theme nodes](./docs/media/readme/hero-relationship-graph.png)

## What You Get

| Feature | Why it matters |
|---|---|
| Relationship Graph | See files, folders, packages, plugin nodes, and their Edges in one interactive graph. |
| Symbol Nodes | Expand files into functions, classes, interfaces, types, variables, constants, and plugin-provided declarations when you need code-level context. |
| Search and Filters | Search temporarily, then use persistent Filters to remove generated files, tests, docs, or any other noise from the Visible Graph. |
| Graph Scope | Turn Node Types and Edge Types on or off so the graph matches the question you are asking. |
| Material Icon Theme nodes | File and folder nodes use Material Icon Theme shapes and colors instead of generic dots. |
| VS Code theme integration | Graph surfaces, panels, buttons, text, and directional arrows follow the active VS Code color theme. |
| CSS Snippets | Load workspace-local CSS files from `.codegraphy/settings.json`, then toggle configured snippets from the Themes panel. |
| Custom graph renderer | CodeGraphy's own WebGPU renderer and deterministic WebAssembly physics keep large graphs responsive and configurable. |
| Context actions | Preview, open, reveal, rename, delete, favorite, filter, and export directly from the graph. |
| Graph Cache | Store workspace-local analysis and settings in `.codegraphy/` so graph behavior stays with the CodeGraphy Workspace. |
| CLI and Agent Skill | Let shell-capable agents incrementally index, configure the saved graph, and query scoped Nodes, Edges, dependencies, dependents, and bounded paths through `@codegraphy-dev/core`. |

## Gallery

| Search and Filters |
|:--:|
| ![Search and filter controls with plugin defaults collapsed](./docs/media/readme/search-filter-panel.png) |

| Symbol Nodes |
|:--:|
| ![CodeGraphy Relationship Graph showing a repository expanded with colorful symbol nodes around file and folder nodes](./docs/media/readme/symbol-nodes-graph.png) |

| Relationship Graph |
|:--:|
| ![Relationship Graph with Material Icon Theme nodes](./docs/media/readme/relationship-graph-2d.png) |

| Large Graphs | Graph Interaction |
|:--:|:--:|
| ![Large CodeGraphy graph with more than one thousand nodes](./docs/media/readme/large-repo-graph.png) | ![Short graph interaction demo](./docs/media/readme/relationship-graph-demo.gif) |

## How It Works

![CodeGraphy architecture and logic flow](./docs/media/readme/codegraphy-architecture.png)

Workspace files and workspace-local settings flow into `@codegraphy-dev/core`. The core package is the central engine: it owns path-based Indexing, built-in Tree-sitter analysis, enabled plugin execution, SQLite Graph Cache reads/writes, Graph Query, and the terminal `codegraphy` CLI. It has no VS Code dependency, so the same engine can be reached through the VS Code extension, CLI, and Plugin API contracts.

The VS Code extension uses `@codegraphy-dev/core` to build and refresh the workspace Graph Cache, then projects that data into the Visible Graph for the webview, exports, Symbol Nodes, and editor interactions. Language and feature plugins are npm packages loaded through core from the user-level installed-plugin cache and the workspace-local `plugins` array; they are not activated as dependent VS Code extensions. The CLI uses the same Core APIs for headless access without opening or focusing VS Code.

The webview renders the Visible Graph through `@codegraphy-dev/graph-renderer`, CodeGraphy's small custom renderer package. It draws with WebGPU and runs fast deterministic force layout and collision physics in WebAssembly. The extension remains the product integration layer: it owns UI, settings, persistence, plugins, selection, hover, picking, and graph controls. The renderer first requests a high-performance WebGPU adapter and can use a fallback WebGPU adapter when the browser provides one; there is no Canvas or WebGL graph fallback when WebGPU is unavailable.

Symbol Nodes are built from indexed declarations and appear alongside file, folder, package, and plugin nodes when you need code-level context. Common kinds include Function, Class, Interface, Type, Struct, Enum, Variable, and Constant. `contains` Edges connect files to their declarations, and symbol-aware relationship Edges show calls, references, inheritance, overrides, imports, and plugin-provided links when analysis can resolve them. Legend defaults style common symbol kinds automatically, custom Legend Entries can target symbol names, kinds, plugin kinds, languages, or containing file paths, and Graph Query CLI exposes the same symbol payloads to agents.

The editable Excalidraw source for this diagram lives at [docs/media/readme/codegraphy-architecture.excalidraw](./docs/media/readme/codegraphy-architecture.excalidraw).

## Install

### VS Code

1. Install the [CodeGraphy VS Code Extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).
2. Open a workspace in VS Code.
3. Click the CodeGraphy activity bar icon.
4. Open the graph, then run **Index Workspace** when you want semantic relationships beyond discovered files.
5. When you want terminal or plugin management workflows, install the Core Package globally and then install plugin packages.

The VS Code extension bundles `@codegraphy-dev/core` for extension runtime behavior, which already ships built-in coverage for JavaScript, TypeScript, TSX, Python, Go, Haskell, Java, Kotlin, Lua, PHP, Ruby, Rust, Swift, Dart, C#, C, C++, Objective-C, Scala, and Pascal. Objective-C and Scala use native Tree-sitter grammars; Pascal uses a core text-baseline analyzer because the available Tree-sitter package does not ship a usable native binding. It does not install the global terminal `codegraphy` command. Markdown is a real plugin package and is enabled by default for new CodeGraphy Workspaces.

Supported VS Code Marketplace platforms:

| Platform | VSIX target | Support status |
|---|---|---|
| Linux x64 | `linux-x64` | Supported |
| macOS Apple Silicon | `darwin-arm64` | Supported |
| Windows x64 | `win32-x64` | Supported |

Intel macOS (`darwin-x64`), Linux arm64, Windows arm64, and Alpine Linux are
not published targets yet. They should be added only after CodeGraphy has a
matching native runtime package and a platform validation lane for that target.

Plugin management starts from the global Core CLI:

```bash
npm install -g @codegraphy-dev/core
npm install -g @codegraphy-dev/plugin-vue
codegraphy plugins register @codegraphy-dev/plugin-vue
codegraphy plugins enable @codegraphy-dev/plugin-vue
codegraphy index
```

### Agent Access

```bash
# Node.js 20-22; Node 22 LTS is recommended.
npm install -g @codegraphy-dev/core
# Available after the public skill repository is published:
npx skills@latest add codegraphy/skills
# Or install the same skill globally for every workspace:
npx skills@latest add codegraphy/skills --global
```

The generalized skill teaches shell-capable agents to run intelligent Indexing when workspace knowledge may have changed, choose a bounded Graph Query command, and then inspect source. Ask something like:

```text
Use CodeGraphy to explain how packages/extension/src/webview/app/shell/view.tsx relates to packages/extension/src/webview/components/graph/viewport/view.tsx.
```

The canonical skill source in this monorepo is [`skills/codegraphy`](./skills/codegraphy/SKILL.md).
Until the public `codegraphy/skills` repository is created, contributors can
install that source from a clone with `npx skills@latest add ./skills/codegraphy`.
Creating and synchronizing the public repository is a release prerequisite;
after publication, the standard command above is canonical.

## CLI Commands

All `codegraphy ...` terminal commands are published by `@codegraphy-dev/core`. Indexing, diagnostics, settings, and graph queries return compact JSON on stdout; help and plugin management use concise text. Commands target the current directory unless the global `-C, --workspace <path>` option selects another CodeGraphy Workspace.

| Command | What It Does |
|---|---|
| `codegraphy --help` | Lists commands or shows scoped help after a command. |
| `codegraphy --version` | Prints the installed Core CLI version. |
| `codegraphy status` | Reports fresh, stale, missing, or unusable Graph Cache state. |
| `codegraphy doctor` | Checks the local runtime, workspace settings, Graph Cache, and plugin state and reports actionable failures. |
| `codegraphy index` | Makes the current Graph Cache current through automatic full or incremental Indexing. |
| `codegraphy nodes` | Lists bounded nodes in the saved Graph Scope, including enabled Symbol Node Types. |
| `codegraphy search <text>` | Searches nodes in the saved Graph Scope. |
| `codegraphy edges` | Lists compact Edges in the saved Graph Scope. |
| `codegraphy dependencies <node>` | Lists outgoing Edges from one exact node. |
| `codegraphy dependents <node>` | Lists incoming Edges to one exact node. |
| `codegraphy path <from> <to>` | Finds bounded directed paths between two exact nodes. |
| `codegraphy scope` | Lists saved and available Node Type and Edge Type Graph Scope. |
| `codegraphy scope node <type> <on\|off>` | Persists one Node Type Graph Scope toggle. |
| `codegraphy scope edge <type> <on\|off>` | Persists one Edge Type Graph Scope toggle. |
| `codegraphy filter` | Lists persisted workspace filter patterns. |
| `codegraphy filter add <glob>` | Adds a persisted workspace filter pattern. |
| `codegraphy filter remove <glob>` | Removes a persisted workspace filter pattern. |
| `codegraphy plugins register <package>` | Registers a globally installed plugin package in the user-level Plugin Registry after validating its CodeGraphy metadata. |
| `codegraphy plugins link <package-root>` | Links a local plugin checkout into the user-level Plugin Registry. |
| `codegraphy plugins list` | Lists registered plugins and which ones are enabled for the selected CodeGraphy Workspace. |
| `codegraphy plugins enable <package>` | Enables a registered plugin for the selected CodeGraphy Workspace. |
| `codegraphy plugins disable <package>` | Disables a registered plugin for the selected CodeGraphy Workspace. |

The CLI does not walk upward to find a parent repo or existing `.codegraphy` folder. Run it from the intended workspace root or select one once per invocation with `--workspace <path>`.

Existing `.codegraphy/graph.lbug` caches are rebuildable generated data and are not migrated in place. The first new Indexing run creates `.codegraphy/graph.sqlite`; the legacy cache can then be removed.

## What Agents Can Query

The CodeGraphy Agent Skill teaches agents to use the Core CLI instead of owning another indexer. `codegraphy index` creates or incrementally updates the same workspace-local Graph Cache used by the extension.

| CLI Command | Agent Can Ask For |
|---|---|
| `codegraphy index` | Make cached workspace knowledge current while reusing unchanged analysis. |
| `codegraphy nodes` / `search` | Find File, Folder, Package, Symbol, and plugin-defined Nodes enabled by Graph Scope. |
| `codegraphy edges` | List high-level Edges and grouped Edge Types. |
| `codegraphy dependencies` / `dependents` | Trace one Node outward or inspect its incoming change impact. |
| `codegraphy path` | Find bounded directed paths between exact Nodes. |
| `codegraphy scope` / `filter` | Inspect or persist the same Graph Scope and filter settings used by the extension. |

## Package Map

| Package | Path | Install | What It Owns |
|---|---|---|---|
| `@codegraphy-dev/core` | `packages/core` | `npm install -g @codegraphy-dev/core` | Shared engine package and terminal CLI for Indexing, Graph Cache access, plugin management, and Graph Query execution. |
| CodeGraphy VS Code Extension | `packages/extension` | [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy) | Graph View, VS Code lifecycle integration, commands, webviews, context menus, and editor integration. |
| `@codegraphy-dev/graph-renderer` | `packages/graph-renderer` | `npm install @codegraphy-dev/graph-renderer` | Custom WebGPU graph drawing and deterministic WebAssembly physics/layout. |
| `@codegraphy-dev/plugin-api` | `packages/plugin-api` | `npm install @codegraphy-dev/plugin-api` | Typed contracts for external CodeGraphy plugins. |
| `@codegraphy-dev/plugin-typescript` | `packages/plugin-typescript` | `npm install -g @codegraphy-dev/plugin-typescript` | TypeScript and JavaScript ecosystem defaults and enrichment. |
| `@codegraphy-dev/plugin-godot` | `packages/plugin-godot` | `npm install -g @codegraphy-dev/plugin-godot` | Godot project, scene, resource, and script enrichment. |
| `@codegraphy-dev/plugin-markdown` | `packages/plugin-markdown` | installed through `@codegraphy-dev/core` | Markdown wikilink and note relationship enrichment enabled by default for new CodeGraphy Workspaces. |
| `@codegraphy-dev/plugin-vue` | `packages/plugin-vue` | `npm install -g @codegraphy-dev/plugin-vue` | Vue Single-File Component script, type-import, and lazy import enrichment. |
| `@codegraphy-dev/plugin-svelte` | `packages/plugin-svelte` | `npm install -g @codegraphy-dev/plugin-svelte` | Svelte component script, type-import, and lazy import enrichment. |
| `@poleski/quality-tools` | external package | local link until publish | Architecture, coverage-risk, mutation, reachability, and test-shape checks used by this repo through root scripts. |

## Tech Stack

| Area | Stack |
|---|---|
| Monorepo | pnpm workspaces, Turbo, Changesets |
| Core package | TypeScript, Tree-sitter, SQLite, headless plugin execution |
| VS Code extension | TypeScript, VS Code Extension API |
| Analysis | Native Tree-sitter plus plugin-provided analyzers |
| Graph storage | SQLite-backed `.codegraphy/graph.sqlite` Graph Cache |
| Webview | React, Vite, Zustand, Tailwind, Radix/shadcn-owned UI primitives |
| Graph rendering | Custom `@codegraphy-dev/graph-renderer` package using WebGPU and deterministic WebAssembly typed-array physics |
| Theming | VS Code color tokens, Material Icon Theme assets |
| Agent access | Core CLI plus the generalized CodeGraphy Agent Skill |
| Quality | Vitest, Playwright, ESLint, CRAP, Stryker mutation, repo-owned quality tools |

## Development

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm run test
pnpm run lint
pnpm run typecheck
```

Useful focused commands:

```bash
pnpm run test:unit
pnpm run test:playwright
pnpm run test:vscode
pnpm --filter @codegraphy-dev/extension run test:node
pnpm --filter @codegraphy-dev/extension run test:webview
pnpm --filter @codegraphy-dev/extension exec vitest run --config vitest.config.ts tests/webview/SettingsPanel.test.tsx
```

CI runs build, lint, typecheck, Playwright, and unit tests as independent lanes. Unit tests are split into package Vitest suites, extension node Vitest, and extension webview groups for graph behavior, app/plugins, and panels/search/export behavior. `pnpm run test:vscode` is a local-only VS Code Electron smoke check for the real extension host.

Plugin authors should start with the [Plugin Guide](./docs/PLUGINS.md), the [plugin lifecycle docs](./docs/plugin-api/LIFECYCLE.md), and [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api).

## Project State

CodeGraphy V4 is the current monorepo rewrite after earlier experiments in [V1](https://github.com/joesobo/CodeGraphy), [V2](https://github.com/joesobo/CodeGraphyV2), and [V3](https://github.com/joesobo/CodeGraphyV3). The central idea is still the same: code is easier to understand when the relationships between files are visible.

The active roadmap lives on [Trello](https://trello.com/b/wG65Lfrb/codegraphy). GitHub issues are not the primary tracker for this repo right now.

## Documentation

| Doc | Covers |
|---|---|
| [Settings](./docs/SETTINGS.md) | `.codegraphy/settings.json`, panels, and Settings Controls. |
| [Export menu](./docs/INTERACTIONS.md#export) | Graph Export JSON/Markdown/image output plus Index Export symbol JSON. |
| [Commands](./docs/COMMANDS.md) | Command Palette reference. |
| [Keybindings](./docs/KEYBINDINGS.md) | Keyboard shortcuts. |
| [Interactions](./docs/INTERACTIONS.md) | Mouse, context menu, toolbar, and panel behavior. |
| [Plugin Guide](./docs/PLUGINS.md) | Build and package plugins for CodeGraphy. |
| [CodeGraphy Agent Skill](./skills/codegraphy/SKILL.md) | Reusable skill that teaches agents to index and query CodeGraphy before broad source search. |
| [Contributing](./CONTRIBUTING.md) | Development setup and contribution workflow. |

## License

MIT
