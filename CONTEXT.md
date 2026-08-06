# CodeGraphy Domain

CodeGraphy turns a folder into an interactive Relationship Graph. People and agents use it to inspect connections between files and code concepts.

Use this glossary for product language, tests, issues, and documentation. Put current behavior and constraints in the closest product or package reference. See [`docs/PHILOSOPHY.md`](./docs/PHILOSOPHY.md) for the product principles behind those decisions.

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
| **Edge Type** | The semantic category of an Edge, such as import, reexport, call, reference, inherit, contains, or nests. |
| **Edge Direction** | The source-to-target direction of a Relationship. The source initiates the import, call, reference, containment, or other relation. |
| **Dependency** | A Relationship whose Edge Type means one Node needs another to build, run, or resolve. Do not use dependency as a synonym for every Relationship. |
| **Downstream** | Following Edge Direction away from a Node. The Edge Type explains what the direction means. |

### Type Definitions and Capabilities

**Node Type Definitions** and **Edge Type Definitions** provide shared semantic labels, visibility defaults, descriptions, and examples. Core analysis, Graph Scope, and plugins use these definitions. Each interface owns styling.

A **Graph Scope Capability Declaration** lists the Node Types and Edge Types that an analyzer or enabled plugin can produce for the indexed workspace. Capabilities describe workspace relevance. They do not assert that the current graph contains a matching Node or Edge.

File, Folder, and Package are structural Node Types. Symbol and Variable are parent toggles that appear when relevant child types exist.

## Graph Pipeline

CodeGraphy narrows graph data in one order:

```text
Relationship Graph -> Scoped Graph -> Filtered Graph -> Graph View Search -> Searched Graph -> Visible Graph
```

| Stage | Meaning |
|---|---|
| **Graph Scope** | Persisted Node Type and Edge Type eligibility. |
| **Scoped Graph** | The Relationship Graph after Graph Scope removes disabled types. |
| **Filter** | Persisted include and exclude rules for recurring workspace noise. |
| **Filtered Graph** | The Scoped Graph after Filter rules. |
| **Graph View Search** | A temporary text query that narrows the current graph without changing Filter settings. |
| **Searched Graph** | The Filtered Graph after Graph View Search. |
| **CLI Search** | A bounded discovery query over exact live source, cached AST Symbols, and indexed Nodes. Sparse natural multi-term phrases add deterministic all-term File candidates. It reports source and cache provenance and does not change settings. |
| **Task Map** | A bounded task-personalized File map combining independent live terms, selected declarations, and cached typed Relationships with source-area diversity. |
| **Target Query** | A bounded overview of one exact File or Symbol Node, including prioritized declarations and incoming/outgoing Relationships. |
| **Visible Graph** | The graph shown on screen after Graph Scope, Filter, Search, Show Orphans, and other view projection rules. |
| **Orphan Node** | A Node with no remaining Edges after graph narrowing. |
| **Show Orphans** | A final Graph View setting that keeps or removes Orphan Nodes. |

Graph Scope runs before Filter. Graph View Search runs after Filter. Sorting and pagination run after those stages. Graph Query inventories use the resulting shaped graph.

CLI Search, Target Query, Path, and exact targeted Relationship selectors read the complete cached Node and Edge Types. The `--node-type` and `--edge-type` options can project those dimensions for one invocation. Path Filters still apply. This behavior keeps Graph View preferences from hiding indexed call or reexport evidence.

Show Orphans is a Graph View presentation setting. It does not affect Indexing or Graph Query.

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
- Every Graph Context Menu identifies that captured Node, Edge, multi-node selection, or workspace root above its actions.
- Multi-node context actions apply only when the action supports the complete Context Selection.
- Delete actions require confirmation and move files or empty created folders to trash.
- Escape dismisses one Graph View layer at a time: a local popup, the Legend prompt, an active edit, Filters, or the active built-in or plugin panel. Only bare-graph Escape clears Node selection.
- Built-in and plugin panels share one exclusive panel region. Closing a panel preserves graph state and focuses the Graph Stage.
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
| **Cached Graph Load** | Read and show the last explicitly indexed Relationship Graph without processing workspace source files. |
| **Live Cache Watch** | An explicit foreground CLI workflow that keeps the Graph Cache current until the process stops. |
| **Refresh Graph** | Restart layout physics without processing source data. |
| **Re-index Workspace** | Run Indexing, save the Graph Cache, and refresh the graph. |

Indexing runs File Discovery, Tree-sitter Analysis, Plugin Analysis, and Graph Projection. JavaScript-family reexports are explicit Relationships. Renamed exports are Alias Symbol Nodes. These records let calls resolve through barrels to implementation Symbols during full and incremental Indexing.

The Graph Cache stores unscoped analysis facts so Graph Scope can hide data without deleting it. Active Filters and Git ignored state exclude files from fresh analysis and the file budget. Cached facts for those files remain reusable but stay out of the current graph.

CodeGraphy loads expensive facts, such as Symbol or plugin-owned tiers, when their scope needs them. It keeps those facts in memory for reuse.

The VS Code extension starts Indexing only after an explicit Index Workspace action. After the Graph Cache exists, the extension uses VS Code workspace events and direct Graph View mutations to keep it current. Saving, creating, deleting, or renaming a workspace file runs targeted incremental Indexing for the changed paths, affected dependents, and plugin-requested paths. The extension patches the Graph Cache and publishes the updated Relationship Graph whether the Graph View is open or closed.

Automatic extension updates never run full-workspace Indexing. When Core cannot bound a change safely, the extension keeps the last consistent graph and marks the index stale. The user can then run Re-index Workspace explicitly. Opening the Graph View reads the current Graph Cache without starting source analysis. The Graph View keeps the current graph visible during incremental updates and explicit Re-indexing.

The `codegraphy watch` CLI command is an explicit foreground workflow for sessions that need a current Graph Cache. It subscribes before the initial synchronization. It watches eligible directories independently, so default exclusions, Git-ignored trees, and whole-subtree Filters do not receive recursive watcher handles. Settings, Git ignore rules, or directory topology changes rebuild those private watch roots before full reconciliation. It batches workspace changes for 500 ms, with a two-second maximum batch age, preserves arrivals during active work, skips cache artifacts and active Filter matches, and flushes pending changes during shutdown.

Graph Cache writers use operation-scoped exclusive transactions through a SQLite coordinator. The coordinator releases ownership when a process terminates, so the watcher does not need long-lived ownership or a heartbeat.

Full and incremental updates acquire writer ownership before their final discovery and source verification. They retain ownership through persistence and retry when newer inputs supersede analyzed inputs. If an incremental write finds a corrupt Graph Cache, it rebuilds the database from current in-memory analysis under the same ownership.

## Interfaces and Ownership

| Surface | Ownership |
|---|---|
| **Core Package** | `@codegraphy-dev/core` owns headless Indexing, Graph Cache storage, plugin processing, Graph Query, and the `codegraphy` CLI. |
| **macOS Desktop App** | `@codegraphy-dev/desktop` owns the Tauri window, File and Folder hierarchy, lightweight editor, safe File access, Core process lifecycle, and adapters over Core and the graph renderer. |
| **VS Code Extension** | Owns VS Code lifecycle, the Graph View, editor actions, workspace settings UI, and adapters over Core and the renderer. |
| **tldraw Interface** | `@codegraphy-dev/tldraw` owns its launcher, tldraw document lifecycle, native shapes, controls, and adapters over Core and renderer physics. |
| **Graph Renderer** | `@codegraphy-dev/graph-renderer` owns WebGPU drawing and deterministic WebAssembly physics. It does not own product settings, persistence, or plugins. |
| **CodeGraphy CLI** | The terminal interface installed by `@codegraphy-dev/core`. It targets the current directory unless `-C, --workspace <path>` selects another workspace. Its foreground `watch` command streams JSON Lines lifecycle events while keeping cached structural facts current. |
| **CodeGraphy Exploration CLI** | `search` combines exact evidence with deterministic all-term fallback ranking for natural phrases; `map` builds a compact task-personalized File map; `query` inspects one exact File or Symbol with prioritized declarations and Relationships. All return bounded JSON with provenance. |
| **CodeGraphy Settings CLI** | `settings`, `settings get`, `settings set`, and `settings unset` read or safely mutate supported workspace settings without silently repairing corrupt persisted input. |
| **Graph Query CLI** | `nodes`, `edges`, `dependencies`, `dependents`, and `path`, all with bounded JSON output over the shaped Relationship Graph. |
| **CodeGraphy Agent Skill** | Generalized instructions that explain the Relationship Graph, lifecycle, query surfaces, machine-readable output, freshness, shaping, and limits so a shell-capable agent can choose its own navigation strategy. |
| **Core Plugin API** | `@codegraphy-dev/plugin-api` contracts for headless Core analysis and semantic graph extensions. |
| **Extension Plugin API** | `@codegraphy-dev/extension-plugin-api` contracts for VS Code Extension and Graph View extensions. |

The CLI does not search parent directories for a workspace. Indexing and exploration are separate operations, so `search`, `map`, and `query` do not perform Indexing. The foreground `watch` command is the exception. It performs an initial synchronization and then keeps cached Symbols and Relationships current as files change.

CLI Search reads source text from eligible indexed File Nodes. It labels cached Symbol provenance as fresh or stale. Source extraction has a 1 MiB limit per file. CodeGraphy omits oversized files and checks freshness with a bounded-memory streamed hash.

Users can raise `maxFiles`, adjust Filters, and re-index when Indexing reaches the file budget. Settings mutations validate known fields. They report malformed input and do not replace it with defaults. The Agent Skill explains the available evidence and tradeoffs while leaving navigation strategy to the agent.

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

- `apps/desktop` owns the macOS product surface and its local Core process boundary.
- `packages/core` owns shared engine behavior and the CLI.
- `packages/extension` owns the VS Code product surface.
- `packages/tldraw` owns the tldraw offline product surface and launcher.
- `packages/graph-renderer` owns graph drawing and physics.
- `packages/plugin-api` owns public Core plugin contracts.
- `packages/extension-plugin-api` owns public VS Code Extension plugin contracts.
- `packages/plugin-*` own optional Core or interface plugins.
- `apps/web` owns account, subscription, billing, and access routes.

Package boundaries are the architecture map. Do not create a parallel `architecture.md`.
