# CodeGraphy Domain

CodeGraphy turns a folder into an interactive Relationship Graph so people and agents can inspect how files and code concepts connect. Use this glossary for product language, tests, issues, and documentation. Current behavior belongs in the focused docs under `docs/`; durable technical decisions belong in `docs/adr/`.

## Graph Model

| Term | Meaning |
|---|---|
| **CodeGraphy Workspace** | The folder CodeGraphy analyzes. It does not need to be a Git repository or repository root. |
| **Relationship Graph** | The complete CodeGraphy graph of files and related codebase concepts. Use this instead of dependency graph, repo graph, workspace graph, or force graph. |
| **Node** | A graph item that represents a file, folder, package, symbol, or plugin-defined concept. |
| **Node Type** | The semantic category of a Node. Styling does not define Node Type. |
| **File Node** | A Node for a concrete file in the workspace. |
| **Folder Node** | A structural Node for a workspace directory. |
| **Workspace Package** | A package whose contents are inside the workspace and can appear in the graph. |
| **External Package** | A package outside the workspace, represented as a package Node instead of expanded files. |
| **Symbol Node** | A declaration such as a function, class, interface, type, variable, or plugin-defined symbol projected from indexed analysis. |
| **Plugin Node** | A Node contributed by a plugin for a concept that Core does not own. |
| **Relationship** | A meaningful connection between two Nodes. |
| **Edge** | A semantic Relationship record with a source, target, and Edge Type. An interface decides how to render it. |
| **Edge Type** | The semantic category of an Edge, such as import, call, reference, inherit, contains, or nests. |
| **Edge Direction** | The source-to-target direction of a Relationship. The source initiates the import, call, reference, containment, or other relation. |
| **Dependency** | A Relationship whose Edge Type means one Node needs another to build, run, or resolve. Do not use dependency as a synonym for every Relationship. |
| **Downstream** | Following Edge Direction away from a Node. The Edge Type explains what the direction means. |

### Type Definitions and Capabilities

**Node Type Definitions** and **Edge Type Definitions** provide shared semantic labels, visibility defaults, descriptions, and examples. Core analysis, Graph Scope, and plugins use these definitions. Each interface owns styling.

A **Graph Scope Capability Declaration** tells CodeGraphy which Node Types and Edge Types an analyzer or enabled plugin can produce for the indexed workspace. Capabilities describe workspace relevance, not whether the current graph already contains a matching Node or Edge. File, Folder, and Package are structural Node Types. Symbol and Variable are parent toggles that appear when relevant child types exist.

## Graph Pipeline

CodeGraphy narrows graph data in one order:

```text
Relationship Graph -> Scoped Graph -> Filtered Graph -> Searched Graph -> Visible Graph
```

| Stage | Meaning |
|---|---|
| **Graph Scope** | Persisted Node Type and Edge Type eligibility. |
| **Scoped Graph** | The Relationship Graph after Graph Scope removes disabled types. |
| **Filter** | Persisted include and exclude rules for recurring workspace noise. |
| **Filtered Graph** | The Scoped Graph after Filter rules. |
| **Search** | A temporary text query that narrows the current graph without changing Filter settings. |
| **Searched Graph** | The Filtered Graph after Search. |
| **Visible Graph** | The graph shown on screen after Graph Scope, Filter, Search, Show Orphans, and other view projection rules. |
| **Orphan Node** | A Node with no remaining Edges after graph narrowing. |
| **Show Orphans** | A final Graph View setting that keeps or removes Orphan Nodes. |

Graph Scope runs before Filter, Filter runs before Search, and sorting or pagination runs after those stages. Core Graph Query uses the same order. Show Orphans is a Graph View presentation setting rather than an Indexing or Graph Query input.

## Selection, Focus, and Collapse

| Term | Meaning |
|---|---|
| **Graph View** | The VS Code surface that contains the Visible Graph, search, controls, panels, and overlays. |
| **Graph Stage** | The themed WebGPU canvas area inside the Graph View. |
| **Select Node** | Mark a Node as the target for actions and multi-selection. |
| **Focused Node** | The Node used as the center of Depth Mode and focus behavior. |
| **Active File** | The file currently active in VS Code and its matching File Node when present. |
| **Context Selection** | The Node or Nodes captured when a Graph Context Menu opens. |
| **Preview File** | Open a File Node in VS Code's temporary preview editor. |
| **Open File** | Open a File Node as a persistent editor tab. |
| **Depth Mode** | A Graph View mode that focuses the Visible Graph around the Focused Node by Edge hops. |
| **Collapse** | Replace a Node and its absorbable downstream subgraph with one Collapsed Node. |
| **Boundary Path** | A downstream path that remains visible because an outside visible Node still connects to its target. |

Interaction rules:

- A single click selects and focuses a Node. File Nodes also preview their file.
- A double-click opens a File Node as a persistent editor tab.
- Right-click captures Context Selection without previewing or opening a file.
- Multi-node context actions apply only when the action supports the complete Context Selection.
- Delete actions require confirmation and move files or empty created folders to trash.
- Collapse follows Edge Direction and preserves Boundary Paths to shared visible targets.
- The VS Code extension owns Collapse Projection. The renderer displays the resulting Visible Graph.

## Indexing and Graph Cache

| Term | Meaning |
|---|---|
| **Indexing** | The public make-current workflow. Core chooses a full or incremental path. |
| **File Discovery** | Read workspace files and directories into graph candidates. |
| **Tree-sitter Analysis** | Core's built-in parser-backed baseline analysis. |
| **Plugin Analysis** | Enabled plugins adding project or ecosystem-specific facts. |
| **Graph Projection** | Turn discovered files and analysis facts into graph Nodes and Edges. |
| **Graph Cache** | Workspace-local SQLite data at `.codegraphy/graph.sqlite`. |
| **Live Update** | Patch graph data after a workspace file change. |
| **Graph Cache Sync** | Show readable cached data first, then update stale inputs in the background. |
| **Refresh Graph** | Restart layout physics without processing source data. |
| **Re-index Workspace** | Run Indexing, save the Graph Cache, and refresh the graph. |

Indexing runs File Discovery, Tree-sitter Analysis, Plugin Analysis, and Graph Projection. The Graph Cache stores unscoped analysis facts so Graph Scope can hide data without deleting it. Active Filters and Git ignored state exclude files from fresh analysis and the file budget; facts cached while those files were eligible remain reusable but stay out of the current graph. Expensive facts such as Symbol or plugin-owned tiers can load when their scope needs them and remain cached for reuse.

The Graph View can use a whole-view loading state before its first graph payload. Graph Cache Sync, Live Update, plugin changes, and Re-index keep the current graph visible after that first render and use graph-local progress.

## Interfaces and Ownership

| Surface | Ownership |
|---|---|
| **Core Package** | `@codegraphy-dev/core` owns headless Indexing, Graph Cache storage, plugin processing, Graph Query, and the `codegraphy` CLI. |
| **VS Code Extension** | Owns VS Code lifecycle, the Graph View, editor actions, workspace settings UI, and adapters over Core and the renderer. |
| **tldraw Interface** | `@codegraphy-dev/tldraw` owns its launcher, tldraw document lifecycle, native shapes, controls, and adapters over Core and renderer physics. |
| **Graph Renderer** | `@codegraphy-dev/graph-renderer` owns WebGPU drawing and deterministic WebAssembly physics. It does not own product settings, persistence, or plugins. |
| **CodeGraphy CLI** | The terminal interface installed by `@codegraphy-dev/core`. It targets the current directory unless `-C, --workspace <path>` selects another workspace. |
| **Graph Query CLI** | `nodes`, `search`, `edges`, `dependencies`, `dependents`, and `path`, all with bounded JSON output. |
| **CodeGraphy Agent Skill** | Instructions that teach shell-capable agents when to index, which Graph Query command to choose, and when to inspect source. |
| **Core Plugin API** | `@codegraphy-dev/plugin-api` contracts for headless Core analysis and semantic graph extensions. |
| **Extension Plugin API** | `@codegraphy-dev/extension-plugin-api` contracts for VS Code Extension and Graph View extensions. |

The CLI never searches parent directories for a workspace. Indexing and Graph Query are separate operations, so a query does not perform Indexing. Agents run Indexing when their task may have changed cached knowledge, then choose the narrowest query that answers the question.

## Plugins

| Term | Meaning |
|---|---|
| **Plugin Package** | An npm package with one or more descriptors in `package.json#codegraphy.plugins`. A package can support several runtime hosts. |
| **Plugin Descriptor** | One plugin ID, host, entry file, and API version declared by a package. |
| **Plugin Host** | The open host string that owns a plugin runtime, such as `core` or `codegraphy.extension`. |
| **Plugin ID** | The stable identifier from a Plugin Descriptor. Activation and plugin-owned data use this ID. |
| **Plugin Registry** | User-level installed Plugin Descriptors at `~/.codegraphy/plugins.json`. |
| **Global Plugin Activation** | The default enabled value for an installed Plugin Descriptor. |
| **Workspace Plugin Activation** | An `inherit`, `enabled`, or `disabled` workspace override. An explicit workspace value wins over the global value. |
| **Dormant Plugin** | An active plugin whose matching host is not open. Its runtime is not imported. |
| **Plugin Data** | Plugin-owned workspace state under `.codegraphy/settings.json#pluginData`, keyed by Plugin ID. |
| **Plugin Options** | Host-owned configuration merged from package defaults and workspace settings before runtime creation. |

Registration, activation, and runtime loading are separate. Core resolves Plugin Activity State for every host. Core imports only active `core` plugins. An interface imports only active plugins for its own host. A missing, incompatible, or conflicting package keeps the user's activation intent in settings but does not run.

The Markdown plugin ships with Core and starts enabled in new workspaces. Other registered plugins start disabled. An enabled Extension plugin stays dormant during a CLI query and runs when the VS Code Extension host opens it.

## Settings and Styling

| Term | Meaning |
|---|---|
| **Setting** | A persisted workspace preference in `.codegraphy/settings.json`. |
| **Settings Control** | A UI control that changes a Setting. |
| **Display Setting** | Presentation behavior that does not change which facts exist in the Relationship Graph. |
| **Filter Rule** | One persisted include or exclude pattern. |
| **Favorite** | A user-marked Node with persistent visual emphasis. |
| **Legend** | The graph styling system for Nodes and Edges. |
| **Legend Entry** | A styling rule matched against graph data. |
| **CodeGraphy CSS Snippet** | A workspace-relative CSS file enabled through `cssSnippets`. |
| **Styling Hook** | A stable `data-codegraphy-*` attribute exposed for CSS Snippets. |
| **Verbose Diagnostics** | Opt-in support logging for extension and CLI workflows. |
| **Interface Data** | Interface-owned workspace state in `.codegraphy/settings.json#interfaces`, stored as open `{ id, data }` entries. Core preserves it without defining IDs or keys. |

Graph Scope decides eligibility. Legend decides styling. Turning off a Legend Entry never hides matching graph items. In the VS Code extension, Legend precedence is Extension defaults, Extension plugin defaults, then custom user entries.

Extension chrome inherits the active VS Code theme. Graph Data Color may encode Node or Edge meaning, but it must remain legible on the themed Graph Stage. Each rendering interface owns its host-specific theme rules and supplies resolved colors to its renderer.

## Package Boundaries

- `packages/core` owns shared engine behavior and the CLI.
- `packages/extension` owns the VS Code product surface.
- `packages/tldraw` owns the tldraw offline product surface and launcher.
- `packages/graph-renderer` owns graph drawing and physics.
- `packages/plugin-api` owns public Core plugin contracts.
- `packages/extension-plugin-api` owns public VS Code Extension plugin contracts.
- `packages/plugin-*` own optional Core or interface plugins.
- `apps/web` owns account, subscription, billing, and access routes.

Package boundaries are the architecture map. Do not create a parallel `architecture.md`.
