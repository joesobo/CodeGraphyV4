# CodeGraphy

CodeGraphy visualizes relationships in a codebase as an interactive graph so people can understand how files and related concepts connect.

## Language

### Graph Model

**Relationship Graph**:
The main CodeGraphy graph that shows relationships between files and related codebase concepts.
_Avoid_: Dependency graph, repo graph, workspace graph, force graph

**CodeGraphy Workspace**:
A folder CodeGraphy can analyze, before or after Indexing has produced a Graph Cache. The workspace does not have to be a git repo or repo root.
_Avoid_: Repo when git behavior is not required, indexed folder

**Detected Language**:
A programming or markup language inferred from files in a CodeGraphy Workspace. Detected Languages help decide which language-specific graph concepts are relevant to the workspace, but detection alone does not mean every deep project-aware relationship is available.
_Avoid_: Supported language when only file presence is known

**Node**:
A graph item representing a file, folder, package, or plugin-defined codebase concept.
_Avoid_: Vertex, dot, point

**Node Type**:
The category that describes what kind of thing a node represents, such as file, folder, package, or a plugin-defined type.
_Avoid_: Legend entry, node style

**Node Type Definition**:
The shared description of a **Node Type**, including its label, default visibility, visual defaults, and optional user-facing explanation or examples. **Graph Scope**, **Legend**, and plugin contributions consume Node Type Definitions instead of redefining what a Node Type means locally.
_Avoid_: Graph Scope tooltip source, local node metadata, UI-only node description

**Node Type Capability**:
A Node Type that is relevant to a CodeGraphy Workspace because at least one detected language, Core Tree-sitter Language Coverage path, or enabled Plugin can produce that Node Type for any file in the workspace. Node Type Capability is workspace-wide, so a mixed-language workspace can have capabilities from several languages at once. It is about what the workspace can produce, not whether the current Relationship Graph already contains a Node of that type.
_Avoid_: Observed node type, visible node type, active-file node type, supported node when meaning current-workspace relevance

**Structural Node Type**:
A core Node Type that is always relevant to a CodeGraphy Workspace regardless of detected language or enabled Plugins. File, Folder, and Package are Structural Node Types.
_Avoid_: Capability-driven node type, symbol parent when meaning always-available graph structure

**Node Type Parent Toggle**:
A Graph Scope row that groups child Node Type Capabilities and appears only when at least one child row is relevant to the CodeGraphy Workspace. Symbol and Variable are Node Type Parent Toggles, not always-visible Structural Node Types.
_Avoid_: Structural node type, standalone node type when the row exists only to group children

**Hidden Irrelevant Node Type Capability**:
A Node Type Capability row that Graph Scope does not display because no Applicable Node Type Capability Provider can currently produce it for the CodeGraphy Workspace. Hiding an irrelevant row does not erase saved Graph Scope or Legend intent; if the capability becomes relevant again, saved visibility and color choices should apply again.
_Avoid_: Disabled node type, deleted setting, observed-missing node

**Pre-index Node Type Scope**:
The Graph Scope Node Type state before CodeGraphy has indexed file paths that Applicable Node Type Capability Providers can evaluate. In this state, Graph Scope should show always-relevant Structural Node Types and hide capability-driven Symbol or Variable rows until workspace capabilities are known.
_Avoid_: All-language default node scope, theoretical symbol scope

**Node Type Capability Provider**:
The source that explicitly declares a Node Type Capability for a CodeGraphy Workspace, such as detected core language coverage or an enabled Plugin. A provider can make core Node Types or plugin-owned Node Types relevant to the workspace. Node Type Capability Providers declare what they can produce; Graph Scope should not infer Node Type Capabilities only from currently observed graph output.
_Avoid_: Node source when referring to Relationship provenance

**Graph Scope Capability Declaration**:
The canonical provider contract that declares relevant Node Type Capabilities and Edge Type Capabilities together for a CodeGraphy Workspace. Graph Scope Capability Declarations are the forward path for enabled Plugins and core language coverage; when this contract replaces an older capability hook, the older hook should be removed rather than kept as compatibility fallback. Changes to this contract should move the codebase to one clear current API and communicate any plugin-author migration through changesets. Capability declarations belong in the analyzer or Plugin layer that owns the language or project semantics, not in Graph Scope UI code, and they should not be inferred from currently observed graph output.
_Avoid_: Legacy capability fallback, separate node capability hook, separate edge capability hook when describing the canonical provider contract

**Applicable Node Type Capability Provider**:
An enabled Node Type Capability Provider whose language, file, or project matcher applies to the current CodeGraphy Workspace. Graph Scope should use Applicable providers when deciding which Node Type Capabilities to show, and inactive Plugins should not contribute Node Type Capabilities. Plugin activity changes should update the available Node Type Capabilities even when inactive plugin-produced Graph Cache facts remain dormant.
_Avoid_: Installed provider when enablement and workspace applicability have not both been checked

**File Node**:
A node representing a concrete file in the workspace.
_Avoid_: Folder node, package node

**Folder Node**:
A structural node representing a directory in the workspace, including an empty directory when folder nodes are active.
_Avoid_: File node

**Plugin Node**:
A node contributed by a plugin to represent a language- or framework-specific concept beyond files, folders, and packages.
_Avoid_: Custom node when precision matters

**Vue SFC Graph**:
A Vue plugin view of the **Relationship Graph** where `.vue` file nodes keep their normal file identity while imports from Vue Single File Component script blocks appear as ordinary file relationships.
_Avoid_: Nuxt Structure Graph, Vue component map

**Package**:
A collection of files and folders that can be represented as one node in the graph.
_Avoid_: Dependency, module, library when used generically

**Workspace Package**:
A package whose files and folders are present in the local workspace and can be expanded into graph nodes by CodeGraphy.
_Avoid_: Local module, project when used generically

**External Package**:
A package whose files and folders are outside the local workspace context and are represented as one package node.
_Avoid_: Dependency when referring to the package itself

### Relationships

**Relationship**:
A meaningful way that two nodes connect within the codebase.
_Avoid_: Dependency, link, connection when used generically

**Edge**:
A rendered relationship between two nodes in the graph.
_Avoid_: Line, link, connector

**Edge Type**:
The category that describes what kind of relationship an edge represents.
_Avoid_: Edge kind, relation type, connection type

**Edge Type Capability**:
An Edge Type that is relevant to a CodeGraphy Workspace because at least one detected language, Core Tree-sitter Language Coverage path, or enabled Plugin can produce that Edge Type for the workspace. Edge Type Capability is about what the workspace can produce, not whether the current Relationship Graph already contains an Edge of that type.
_Avoid_: Observed edge type, visible edge type, supported edge when meaning current-workspace relevance

**Edge Type Capability Provider**:
The source that declares an Edge Type Capability for a CodeGraphy Workspace, such as detected core language coverage or an enabled Plugin. A provider can make core Edge Types or plugin-owned Edge Types relevant to the workspace.
_Avoid_: Edge source when referring to Relationship provenance

**Applicable Edge Type Capability Provider**:
An enabled Edge Type Capability Provider whose language, file, or project matcher applies to the current CodeGraphy Workspace. Graph Scope should use Applicable providers when deciding which Edge Type Capabilities to show.
_Avoid_: Installed provider when enablement and workspace applicability have not both been checked

**Edge Type Definition**:
The shared description of an **Edge Type**, including its label, default visibility, visual defaults, and optional user-facing explanation or examples. **Graph Scope**, **Legend**, and plugin contributions consume Edge Type Definitions instead of redefining what an Edge Type means locally.
_Avoid_: Graph Scope tooltip source, local edge metadata, UI-only edge description

**Language-Specific Edge Type**:
An **Edge Type** whose meaning is specific to one language or ecosystem and should stay distinct from a broader shared Edge Type when merging would hide important language semantics. A language relationship should merge into an existing Edge Type only when the source and target meaning truly match the existing definition.
_Avoid_: Generic import edge when the relationship has language-specific semantics, new edge type when the existing Edge Type already means the same relationship

**Acceptance-Visible Language Relationship**:
A language-specific relationship that CodeGraphy intentionally exposes as an **Edge Type Capability** and validates in language example acceptance coverage. A syntax form can be Tree-sitter-visible without becoming an acceptance-visible relationship when it does not create useful graph structure.
_Avoid_: Every expression edge, parser-visible edge, syntax-only relationship

**Edge Direction**:
The source-to-target orientation of an edge, where the source node initiates the relationship and the target node is the thing being used, referenced, tested, or contained.
_Avoid_: Provider direction, reverse relationship direction

**Downstream**:
Following edge direction away from a node without implying the nature of the relationship.
_Avoid_: Dependency direction unless the edge type is a Dependency

**Dependency**:
A relationship whose edge type specifically means one node needs another node to work, build, run, or resolve.
_Avoid_: Relationship when the edge only shows communication, reference, or navigation

**Nests Relationship**:
A structural relationship where a folder or package contains a file, folder, or package.
_Avoid_: Dependency, import

**Relationship Source**:
The analyzer or plugin evidence that contributed a relationship to the graph.
_Avoid_: Edge source when referring to provenance

### Graph Pipeline

**Graph Scope**:
The persisted settings that choose which **Node Types** and **Edge Types** are eligible for downstream graph stages.
_Avoid_: Visibility when referring to the final visible graph, filter when referring to include/exclude criteria

**Scoped Graph**:
The Relationship Graph after Graph Scope removes disabled **Node Types** and **Edge Types**.
_Avoid_: Visible graph, filtered graph

**Filter**:
To apply persisted include and exclude criteria that decide which graph items remain eligible after **Graph Scope**.
_Avoid_: Search, Collapse, Graph Scope

**Filtered Graph**:
The Scoped Graph after persistent include and exclude filter criteria have been applied.
_Avoid_: Visible graph

**Search**:
A temporary query used to find or narrow graph items without changing repo filter rules.
_Avoid_: Filter when referring to temporary search input

**Searched Graph**:
The Filtered Graph after temporary search criteria have narrowed it.
_Avoid_: Filtered graph

**Visible Graph**:
The graph shown on screen after **Graph Scope**, **Filter**, **Search**, and final view settings such as **Show Orphans** have been applied.
_Avoid_: Relationship graph, filtered graph when collapse or search is also active

**Orphan Node**:
A node with no edges after **Graph Scope**, **Filter**, **Search**, and structural view settings have been applied, before **Show Orphans** decides whether it remains visible.
_Avoid_: Isolated file if the node is not a file

**Show Orphans**:
A final **Graph View** presentation setting that keeps or removes Orphan Nodes after orphan status is calculated. It is not an **Indexing** input or a Core Package **Graph Query** configuration field.
_Avoid_: Filter Setting, Graph Scope, Indexing option, Graph Query option

### Collapse And Focus

**Collapse**:
To simplify the graph by replacing a node and its downstream relationship subgraph with one collapsed node.
_Avoid_: Hide, group when used loosely

**Collapsed Node**:
A visible node that represents itself plus hidden downstream relationship nodes.
_Avoid_: Group node, aggregate node

**Boundary Path**:
A visible downstream path from a collapsed node to a shared relationship target that cannot be absorbed.
_Avoid_: Partial collapse path, bridge chain

**Collapse Projection**:
The CodeGraphy-owned graph transformation that responds to user collapse input after the graph has been rendered, then sends the updated Visible Graph to the renderer.
_Avoid_: Renderer-owned collapse, tree-only collapse

**Depth Mode**:
A **Graph View** interaction mode applied after the **Visible Graph** exists, focusing the graph around the currently selected node by depth measured in edge hops.
_Avoid_: Separate view

**Focused Node**:
The node that Depth Mode uses as the center of its local graph focus.
_Avoid_: Active file when the focus is not file-specific

**Active File**:
The file currently active in VS Code and mirrored by the matching file node in CodeGraphy when available.
_Avoid_: Focused Node when the focus is a folder, package, or plugin node

**Select Node**:
To mark a node as the current graph selection for actions, context menus, and focus behavior.
_Avoid_: Open, preview

**Context Selection**:
The node or nodes targeted by a Graph Context Menu action.
_Avoid_: Focused Node when right-click target differs from focus

**Graph Context Menu**:
The right-click menu opened from a **Context Selection** in the **Graph View**. The menu exposes actions that are valid for the selected graph target.
_Avoid_: Context Window unless referring to a persistent panel or window

**Preview File**:
To open a file node in VS Code's temporary preview editor state.
_Avoid_: Permanent open, full open

**Open File**:
To open a file node as a persistent VS Code editor tab.
_Avoid_: Preview file

### Indexing And Cache

**Indexing**:
The public make-current workflow for a CodeGraphy Workspace. Core runs full analysis for a missing or incompatible Graph Cache, or the fastest correct incremental path for a compatible cache. The caller asks to make the cache current; Core owns the full-versus-incremental decision.
_Avoid_: Scanning when analysis and graph projection are included

**File Discovery**:
The indexing stage that reads the workspace file and folder structure into graphable file and folder candidates.
_Avoid_: Indexing when only collecting paths

**Tree-sitter Analysis**:
The built-in analysis pass that uses Tree-sitter to produce baseline relationships before plugin enrichment.
_Avoid_: Plugin analysis

**Tree-sitter Runtime**:
The parser engine CodeGraphy uses to run language grammars during Tree-sitter Analysis.
_Avoid_: Language coverage, analyzer

**Core Tree-sitter Language Coverage**:
A language grammar and CodeGraphy analyzer path bundled in the Core Package that produces baseline relationships during Tree-sitter Analysis.
_Avoid_: Tree-sitter support when only the parser runtime or grammar package is present

**Built-In Language Coverage Target**:
A language feature that a developer working in that language would reasonably expect CodeGraphy's built-in analysis to represent, when Tree-sitter can expose the feature clearly enough to produce low-noise Nodes or Relationships. Language features that require project-specific semantics beyond Tree-sitter belong in Plugin Analysis instead.
_Avoid_: Plugin support when the feature belongs to Core Tree-sitter Language Coverage, supported feature when Tree-sitter cannot expose enough evidence

**Acceptance-Visible Language Construct**:
A **Built-In Language Coverage Target** that CodeGraphy intentionally exposes through Graph Scope and language example acceptance coverage. A construct can be Tree-sitter-visible but still stay out of acceptance-visible coverage when it is too fine-grained for the Relationship Graph.
_Avoid_: Every AST node, parser-visible construct, implementation detail

**C# Method Construct**:
The acceptance-visible C# behavior node for named executable code declared as a normal method or local function. C# local functions are grouped with methods for Graph Scope purposes; C# does not use separate Function or Callable rows.
_Avoid_: Function when describing C# local functions, Callable for C# method-like constructs

**Plugin Analysis**:
The indexing stage where plugins add or adjust **Nodes**, **Relationships**, and **Edge Types** after the built-in baseline analysis.
_Avoid_: Tree-sitter analysis

**Project-Aware Analysis Semantics**:
Language- or ecosystem-specific relationship evidence that requires reading project configuration, package layout, or framework conventions beyond a single file's syntax.
_Avoid_: Core Tree-sitter Language Coverage when the behavior needs project-specific configuration

**Unity Project File Analysis**:
Plugin Analysis for Unity workspaces that derives Relationships from Unity source and project files without launching the Unity Editor or reading generated editor state.
_Avoid_: Unity Editor integration, C# language coverage when meaning Unity-specific project graphing

**Unity Parser Model**:
The Unity Plugin-owned read model for source-controlled Unity YAML, `.meta`, package, and assembly-definition files, adapted from Unity parser precedents into CodeGraphy Node and Relationship facts rather than executed as an external parser runtime.
_Avoid_: Unity AST, Unity Editor API, external parser dependency when meaning the CodeGraphy-owned model

**Unity Concept Node**:
A Plugin Node that represents a Unity project concept such as a Scene, Prefab, GameObject, Component, or ScriptableObject Asset when that concept can be derived from source-controlled Unity project files.
_Avoid_: File Node when the graph item represents the Unity concept rather than only the serialized file

**Unity Node Type Scope**:
A Unity Plugin-owned Graph Scope parent row that appears only when the Unity Plugin is enabled and groups Unity Concept Node rows such as Scene, Prefab, GameObject, and Component.
_Avoid_: Core Symbol scope, always-on Unity rows

**Unity Example Contract**:
The `examples/example-unity` workspace is the source-of-truth target for the full Unity support PR, covering the Unity Concept Nodes and Relationships intended for that PR before implementation is shaped to satisfy them.
_Avoid_: Minimal fixture, partial slice when the PR intends broader Unity support

**Graph Projection**:
The indexing stage that turns discovered files and analysis results into graph nodes and edges.
_Avoid_: Rendering

**Graph Cache**:
The workspace-local SQLite data at `<workspace-root>/.codegraphy/graph.sqlite` that stores indexed Relationship Graph data for CodeGraphy and agent access. SQLite is the persistence implementation; Graph Cache is the product and domain term.
_Avoid_: Saved index, saved DB, CodeGraphy database when speaking in domain terms

**Live Update**:
An incremental graph update from CodeGraphy Workspace changes after indexing has already produced a cache.
_Avoid_: Re-index, refresh

**Graph Cache Sync**:
A background catch-up pass that runs after cached graph data has already been rendered. Graph Cache Sync compares the workspace-local Graph Cache with current runtime inputs such as enabled plugins, plugin signatures, settings signatures, schema metadata, and pending changed files, then updates graph data without replacing the whole Graph View with a loading state.
_Avoid_: Re-index when a readable cache is already being shown, reconciliation

**Refresh**:
A user-triggered graph rerender that restarts graph physics without reprocessing graph data.
_Avoid_: Re-index, live update

**Refresh Graph**:
The UI action that refreshes graph layout by restarting graph physics without rebuilding graph data.
_Avoid_: Re-index Workspace

**Re-index**:
A user-triggered rebuild of graph data that reruns indexing and then refreshes the graph after data updates.
_Avoid_: Refresh when only rerunning graph physics

**Re-index Workspace**:
The UI action that rebuilds Relationship Graph data by running indexing, saving the result, and then refreshing the graph.
_Avoid_: Refresh Graph

### Agent Access

**CodeGraphy CLI**:
The terminal `codegraphy` command installed by the **Core Package** npm package for path-first CodeGraphy Workspace commands such as setup, Indexing, Graph Query, status, plugin discovery, and workspace plugin enablement. Repo-local CLI commands take an optional trailing workspace path argument. When that path is omitted, they use the process current working directory exactly; they do not walk upward to find a parent repo or existing `.codegraphy` folder.
_Avoid_: Agent server, extension command

**Graph Query CLI**:
The `codegraphy query` command group that exposes bounded Core **Graph Query** reports for nodes, edges, Relationships, symbols, and paths. It returns stable JSON on stdout and sends diagnostics to stderr so humans and shell-capable agents use the same interface.
_Avoid_: Natural-language query, Graph View

**CodeGraphy Agent Skill**:
A generalized Agent Skills-compatible instruction package that teaches shell-capable coding agents when to run **Indexing**, how to choose the narrowest **Graph Query CLI** command, and when to read source files after graph discovery. It is installable globally or per workspace and does not depend on a specific agent client.
_Avoid_: Codex-only skill, CLI implementation

**Graph Query**:
An agent or Graph View request against Relationship Graph data that can apply Graph Scope, Filter, Search, sorting, pagination, traversal, and result limits before returning graph data.
_Avoid_: View graph, saved graph view, Visible Graph when the result is not the UI-rendered graph

### Views

**View**:
A VS Code extension UI container owned by CodeGraphy.
_Avoid_: Graph state, projection, filtered graph

**VS Code Theme Integration**:
The product rule that CodeGraphy UI chrome inherits the active VS Code theme before applying CodeGraphy-specific styling. Controls, panels, popovers, borders, focus states, and other extension chrome should feel native to the current VS Code theme while staying consistent across CodeGraphy surfaces.
_Avoid_: Custom CodeGraphy theme, hardcoded chrome colors

**Graph Data Color**:
Color that encodes Relationship Graph meaning, such as Node Type, Edge Type, Legend Entry, or graph state. Graph Data Color may diverge from the active VS Code theme when it carries graph meaning, but it should still remain legible against themed surfaces.
_Avoid_: Chrome color, brand color

**Graph View**:
The CodeGraphy view where users interact with the Relationship Graph and its surrounding controls.
_Avoid_: Visible graph

**Graph Stage**:
The themed canvas surface inside the **Graph View** where the **Relationship Graph** is rendered. The Graph Stage may use a dedicated CodeGraphy surface token for graph readability, but that token must be derived from the active VS Code theme.
_Avoid_: Hardcoded canvas, detached app background

**Graph Tool Rail**:
The icon-first, tooltip-backed control rail in the **Graph View** for high-frequency graph tools and graph-local panel entry points. It should be grouped so dense multi-choice tools open menus, popovers, or panels instead of appearing as long direct button lists.
_Avoid_: Dumping ground toolbar, command palette replacement

**Graph Scope Panel**:
The graph-local panel opened from the **Graph Tool Rail** for choosing which **Node Types** and **Edge Types** are included by **Graph Scope**. It combines node-type and edge-type scope controls under one predictable surface.
_Avoid_: Nodes panel and Edges panel as unrelated settings

**Graph Panel**:
A graph-local side panel opened from the **Graph Tool Rail** for controls or editors that need more room than a compact popover. Graph Panels should size to their content within sensible min/max constraints rather than all sharing one arbitrary width.
_Avoid_: Fixed-width drawer when the content requires a different size

**Graph Tool Popover**:
A compact popover opened from the **Graph Tool Rail** for quick multi-choice graph tools such as layout and node sizing.
_Avoid_: Graph Panel for small choice sets

**Graph Stage Corner Controls**:
Viewport navigation and window controls anchored on the **Graph Stage**, such as zoom, fit, and open-in-editor. They are visually separate from the **Graph Tool Rail** and should not become graph settings or graph-scope controls.
_Avoid_: Toolbar controls, display settings

**Graph View Zoom**:
A Graph View interaction that changes how close the user is to the rendered graph without changing graph data.
_Avoid_: Graph Scope, Filter, Search, Refresh

**Continuous Zoom**:
Graph View Zoom that repeats while the user holds a zoom control.
_Avoid_: Fit View, Refresh

### Plugins And Core

**VS Code Extension**:
The CodeGraphy VS Code extension that owns visualization, VS Code lifecycle integration, editor commands, webviews, and VS Code-specific UI.
_Avoid_: Core engine, plugin host only

**Core Package**:
The `@codegraphy-dev/core` npm package that owns the central CodeGraphy engine: headless Indexing, Graph Cache access, plugin wiring, Graph Query, and the terminal `codegraphy` command.
_Avoid_: VS Code extension when referring to headless engine behavior

**CodeGraphy Interface**:
A user, agent, terminal, or programmer-facing way to interact with the **Core Package** without owning the engine. The **VS Code Extension** is the graphical user interface, **CodeGraphy CLI** is the terminal and shell-capable agent interface, **CodeGraphy Agent Skill** teaches agents that interface, and **Plugin API** is the programmer interface for plugin authors.
_Avoid_: Engine, core owner, implementation package

**Plugin Processing**:
The Core Package-owned workflow for discovering Installed Plugin Packages, enabling or disabling Plugins for a CodeGraphy Workspace, loading active plugin runtimes, routing plugin roles, emitting plugin lifecycle events, and deciding when plugin work runs. CodeGraphy Interfaces request Plugin Processing actions from Core and render Core results; they do not own plugin activation or role execution.
_Avoid_: Extension plugin handling, interface-owned plugin runtime

**Plugin**:
A headless CodeGraphy npm package that communicates with `@codegraphy-dev/core` to add or improve analysis, graph types, filters, symbols, and relationship evidence.
_Avoid_: VS Code extension when referring to the CodeGraphy capability, Tree-sitter Analysis

**Plugin Package**:
An npm package that declares package compatibility in `package.json#codegraphy`, declares static Plugin ID and display metadata in `codegraphy.json`, and exports a CodeGraphy plugin runtime through normal package exports.
_Avoid_: VS Code extension package

**Installed Plugin Package**:
A Plugin Package registered in the user-level Plugin Registry and discoverable through CodeGraphy Interfaces such as the CodeGraphy CLI and VS Code Extension. An Installed Plugin Package is available to enable from any CodeGraphy Workspace, but installation does not make it active in any workspace. Its npm package name and version identify the installed package source; its Plugin ID identifies the CodeGraphy capability that can become workspace active. CodeGraphy Interfaces should receive installed package identity and Plugin ID from Core and render available Disabled Plugins from static metadata, without importing or creating the plugin runtime.
_Avoid_: Enabled plugin, active plugin

**Plugin ID**:
The stable CodeGraphy capability identifier declared in static `codegraphy.json` metadata and used for Plugin Activity State, Plugin API ownership, graph provenance, lifecycle hooks, Graph View roles, Plugin Data, and workspace enablement. Core treats the npm package name as package identity and the Plugin ID as capability identity; package authors may choose a package-derived ID or a CodeGraphy-style ID such as `codegraphy.vue`, but runtime `plugin.id` must match `codegraphy.json#id`. If two Installed Plugin Packages claim the same Plugin ID, Core must surface a Plugin Identity Conflict and refuse to enable that Plugin ID until the conflict is resolved.
_Avoid_: Package name when referring to workspace activity, runtime instance

**Plugin Identity Conflict**:
A Core-detected ambiguity where more than one Installed Plugin Package claims the same Plugin ID. A conflicted Plugin ID is not a Workspace Enabled Plugin and must not be imported, created, registered, or executed. CodeGraphy Interfaces should surface the conflict as a developer-console warning from static metadata, but they must not silently choose a winning package.
_Avoid_: Last package wins, disabled plugin when ambiguity is the reason, user-facing conflict chooser

**Workspace Enabled Plugin**:
An Installed Plugin Package or Built-in Plugin explicitly enabled for the current CodeGraphy Workspace and loaded through Plugin Integration. CodeGraphy Workspace settings persist Plugin ID activity intent by the Plugin ID declared in static `codegraphy.json` metadata, such as `codegraphy.vue`: `enabled: true` means the plugin has been set active, `enabled: false` means the plugin has been set disabled, and no entry means the plugin has not been touched in that workspace. Core resolves each `enabled: true` Plugin ID to exactly one Installed Plugin Package or Built-in Plugin when building Plugin Activity State. Installed Plugin Packages are disabled by default for a workspace until a CodeGraphy Interface enables their Plugin ID for that workspace. Only Workspace Enabled Plugins can access the Plugin API and extend the Core Package or VS Code Extension. Importing, creating, registering, and running the plugin runtime is part of enabling the plugin for a workspace.
_Avoid_: Installed plugin, available plugin

**Disabled Plugin**:
An Installed Plugin Package or Built-in Plugin with `enabled: false` in the current CodeGraphy Workspace, or no workspace setting entry when the plugin is disabled by default. A Disabled Plugin is unloaded: it has no Plugin API access, runs no analysis, contributes no graph concepts, publishes no Graph View roles, and does not communicate with the Core Package or VS Code Extension except through static metadata used to render its enable toggle.
_Avoid_: Hidden active plugin, inactive background plugin

**Plugin Integration**:
The host module that loads Workspace Enabled Plugins and connects them to CodeGraphy roles such as Plugin Analysis, Edge Type Capabilities, Node Type and Edge Type Definitions, Filter Rules, Graph View contributions, webview assets, and lifecycle hooks. Plugin Integration must consult Plugin Activity State before loading, executing, or publishing plugin roles. Core Plugin Integration owns Core Package roles such as Plugin Activity State, Plugin Analysis, Edge Type Capabilities, Node Type and Edge Type Definitions, Filter Rules, lifecycle hooks, Graph Cache, and Graph Query consistency. Core Plugin Integration also owns the enable/disable plan for a CodeGraphy Workspace, including whether Graph Cache Sync, targeted plugin-file reprocessing, or Re-index is required after a plugin toggle. Disabling a Plugin unloads the runtime immediately, but plugin-produced Graph Cache facts can remain as dormant facts that Graph Projection and Graph Query exclude while the Plugin is disabled and can reuse when the Plugin is re-enabled unless stale. Graph View Plugin Integration consumes Core Plugin Integration activity decisions and owns VS Code Extension adapters such as context menus, exporters, toolbar actions, webview injections, contribution statuses, decorations, and plugin-owned UI publishing. The VS Code Extension can ask Core to enable a Plugin for a workspace and can render Core-approved active plugin roles, but it does not own plugin activation.
_Avoid_: Scattered plugin wiring, plugin UI refresh path

**Plugin Activity State**:
The Core Package-owned CodeGraphy Workspace state that decides which Plugin IDs are Workspace Enabled Plugins and which are Disabled Plugins from persisted workspace activity intent. Plugin Activity State resolves `enabled: true` Plugin IDs against Built-in Plugins and Installed Plugin Packages before any runtime import, factory creation, registration, lifecycle call, analysis, or contribution publishing. An `enabled: true` Plugin ID that is missing, conflicted, invalid, or incompatible remains active intent in workspace settings but inactive in Plugin Activity State, and Core or the calling CodeGraphy Interface should surface a developer-console warning from static metadata. A Disabled Plugin is unloaded and contributes nothing: no analysis, graph types, capabilities, filters, Graph View roles, webview assets, lifecycle hooks, or plugin-owned UI. The VS Code Extension should consume the same Plugin Activity State and add Graph View-specific adapters on top. Plugin Activity State is distinct from toggling individual Plugin-owned Filter Rules and from Plugin Data.
_Avoid_: Disabled plugin filter patterns, installed plugins, registered plugins

**Plugin Data**:
Workspace-local plugin-owned persisted state stored under `.codegraphy/settings.json#pluginData` by Plugin ID and exposed to enabled plugin runtimes through the Plugin API data host. Plugin Data belongs to the plugin for feature state such as saved sections, plugin-owned UI state, or other workspace-specific plugin state. It must not represent whether a Plugin ID is enabled or disabled; Plugin Activity State owns enablement. Plugin Data for a Disabled Plugin may remain dormant in workspace settings, but the disabled plugin cannot read or write it because its runtime is unloaded.
_Avoid_: Plugin Activity State, plugin options, installed package metadata

**Plugin Options**:
Host-owned configuration merged from an Installed Plugin Package's defaults and CodeGraphy Workspace settings, then passed to an enabled plugin runtime when Core creates the plugin factory options. Plugin Options configure how a plugin should run; Plugin Data is plugin-owned state saved after the plugin runs. Plugin Options must not represent whether a Plugin ID is enabled or disabled.
_Avoid_: Plugin Data, Plugin Activity State

**Disabled Plugin Test Contract**:
Tests for disabled plugin behavior must prove the plugin runtime is not imported, created, registered, initialized, loaded with Plugin API access, called through lifecycle hooks, or allowed to publish Core Package or Graph View contributions. Tests that only prove disabled plugin contributions are filtered out are insufficient for Plugin Activity State.
_Avoid_: Visibility-only disabled plugin tests

**Plugin Registry**:
The user-level list of globally installed plugin packages CodeGraphy has explicitly registered at `~/.codegraphy/plugins.json`. A registered plugin is available to enable in a CodeGraphy Workspace, but registration does not enable it anywhere.
_Avoid_: Workspace Settings, enabled plugins

**Built-in Plugin**:
A plugin developed with CodeGraphy and shipped from the monorepo as part of the current product experience or examples.
_Avoid_: Required plugin

**Markdown Plugin**:
The Plugin Package bundled with CodeGraphy, enabled by default for new CodeGraphy Workspaces, and still toggleable like any other Plugin. Core Plugin Activity State treats Markdown as enabled for a fresh workspace before settings are materialized, so CodeGraphy Interfaces can show its toggle as enabled without creating `.codegraphy/settings.json`. When workspace settings are created, such as during first Indexing or an explicit plugin toggle, Markdown is written as `enabled: true` unless the user disables it; disabling persists `enabled: false`. The Markdown Plugin exists because Tree-sitter Analysis does not provide CodeGraphy's markdown relationships; disabling it fully unloads the plugin runtime and leaves only static metadata for the enable toggle.
_Avoid_: External markdown extension, special-case markdown runtime

### Settings And Styling

**Setting**:
A workspace-local persisted preference in `.codegraphy/settings.json` that changes graph behavior, appearance, filtering, plugin enablement, or feature state.
_Avoid_: Control when referring to the persisted value

**Settings Control**:
A UI control that changes a Setting.
_Avoid_: Setting when referring only to the UI element

**Display Setting**:
A Setting that changes how graph information is presented without changing which graph items exist in the **Relationship Graph**. Display Settings include visual preferences and lower-frequency view behavior such as labels, orphans, direction indicators, bidirectional edge display, and depth controls.
_Avoid_: Graph Scope, Search, Filter Setting

**CodeGraphy CSS Snippet**:
A workspace-local CSS file referenced by `.codegraphy/settings.json#cssSnippets` and loaded by CodeGraphy into the VS Code Extension webview to let users customize exposed CodeGraphy styling hooks without building a full theme. The `cssSnippets` setting is an object whose keys are snippet paths and whose boolean values enable or disable each snippet: `true` loads the snippet, `false` keeps the snippet known but inactive, and omitted paths do nothing. CSS Snippets can style stable CodeGraphy surfaces such as the Graph View and Graph Stage, use normal CSS cascade order from object insertion order when multiple snippets are enabled, but they do not replace VS Code Theme Integration, do not belong in Plugin Data, and should not change Relationship Graph data.
_Avoid_: App theme, VS Code theme, graph data styling, plugin-owned state

**CSS Snippet Loading**:
The VS Code Extension behavior that resolves enabled workspace-relative `.codegraphy/settings.json#cssSnippets` entries to stylesheet links and sends the ordered set to the webview. CSS Snippet paths must stay inside the CodeGraphy Workspace; absolute paths and parent traversal are outside the contract. Missing, invalid, or out-of-workspace enabled snippet paths should produce developer-console warnings rather than user-visible interruption. Disabled snippet paths should not warn or load. CSS Snippet Loading should respond when CodeGraphy Workspace settings change; watching snippet file contents for automatic reload is a later capability.
_Avoid_: Theme rebuild, CSS file watcher when only settings changes are observed, arbitrary local file loading

CodeGraphy CSS Snippet user docs and changesets should explain how to create a workspace-local CSS file, add it to `.codegraphy/settings.json#cssSnippets` with `true`, set it to `false` to disable it without forgetting the path, reload or update settings to apply it, and use CodeGraphy Styling Hooks to target extension surfaces.

**CodeGraphy Styling Hook**:
A stable `data-codegraphy-*` attribute exposed by the VS Code Extension webview so CodeGraphy CSS Snippets can target intentional UI surfaces. Styling Hooks are a public customization contract across the CodeGraphy Extension UI and should describe durable product surfaces, regions, panels, controls, and graph layers instead of incidental React component structure. Adding Styling Hooks is a good time to replace generic `div` wrappers with semantic HTML elements such as `main`, `section`, `nav`, `form`, and `button` where those elements match the UI behavior.
_Avoid_: Test id, internal class name, bare custom HTML attribute

**Styling Hook Audit**:
The implementation pass that inventories rendered CodeGraphy Extension UI surfaces, adds stable CodeGraphy Styling Hooks to meaningful user-recognizable regions, and upgrades generic wrappers to semantic HTML where appropriate before relying on CSS Snippets for customization.
_Avoid_: Blanket div tagging, incidental DOM contract

**Verbose Diagnostics**:
A Setting that enables verbose CodeGraphy diagnostic logging for Core Package and VS Code Extension lifecycle support workflows while a user reproduces an issue. It stays off by default so ordinary CodeGraphy use remains quiet.
_Avoid_: Dev Mode when the behavior only refers to diagnostic logging

**Filter Setting**:
A persisted Setting that defines include or exclude criteria for path/glob patterns first. Exclude criteria remove recurring noise; include criteria narrow graph consideration to a durable working subset. Graph-aware filter criteria may be added later only when they have clear semantics separate from **Graph Scope**.
_Avoid_: Search, collapse

**Filter Rule**:
One include or exclude pattern in **Filter Settings**. A Filter Rule can come from CodeGraphy defaults, a Plugin, or a custom user entry, and the UI should make its origin and enabled state clear. Source-owned Filter Rules should have a stable source and rule id so user toggles survive source pattern updates. Custom user Filter Rules should also have generated stable ids so editing pattern text does not break row identity, ordering, focus, or UI state. Origin should be shown with a subtle label when space allows and always be available through a tooltip.
_Avoid_: Search option, Graph Scope toggle

**Filter Rule Override**:
A custom user-owned copy or replacement of a source-owned **Filter Rule**. Built-in and plugin-contributed Filter Rules are not directly edited; users can toggle them, and editing creates a user-owned override or copy.
_Avoid_: Editing plugin defaults in place

**Favorite**:
A user-marked node that should be easier to find or visually distinguish in the graph.
_Avoid_: Bookmark if it only means graph presentation

**Legend**:
The graph theming system for styling nodes and edges.
_Avoid_: Filter, VS Code theme

**Legend Entry**:
A rule in the Legend that matches graph items and can provide styling such as color, shape, and icon.
_Avoid_: Filter rule

**Legend Layer**:
A precedence level for Legend Entries, ordered core first, then plugin defaults, then custom user entries.
_Avoid_: Theme source when precedence matters

**Legend Entry Toggle**:
A setting that enables or disables applying one Legend Entry's styling without hiding the matching graph items.
_Avoid_: Visibility toggle, filter

**Export**:
A user action that writes graph or indexed analysis data outside CodeGraphy for sharing, inspection, or reuse.
_Avoid_: Cache, save settings

**Graph Export**:
An export of the current Visible Graph as JSON, Markdown, or image output.
_Avoid_: Index export

**Index Export**:
An export of cached analysis data such as symbols and relationships for software or agent consumption.
_Avoid_: Graph export

## Relationships

- A **Relationship Graph** is presented through the interactive **Graph View**.
- A **Relationship Graph** contains **Nodes** connected by **Edges**.
- The graph pipeline is **Relationship Graph** -> **Scoped Graph** -> **Filtered Graph** -> **Searched Graph** -> **Visible Graph**.
- **Graph Scope** runs before **Filter Settings** so disabled **Node Types** and **Edge Types** are removed before persistent include/exclude criteria are evaluated.
- **Show Orphans** runs at the end of the **Visible Graph** pipeline because **Orphan Node** status only exists after **Edge Type** toggles and other graph stages have been applied.
- A **Node Type** is semantic and describes what a node represents; a **Legend Entry** may match a **Node Type**, but a **Node Type** is not styling.
- A **File Node** is the default node type and can preview or open its file in VS Code.
- A **Folder Node** is synthesized from workspace paths when folder scope is enabled, connects through **Nests Relationships**, and is not opened like a file.
- A **Plugin Node** keeps CodeGraphy open to concepts the core does not define yet.
- A **Workspace Package** can be expanded into the files and folders CodeGraphy can read.
- An **External Package** is represented as one package node because its files and folders are outside the local context.
- For now, Workspace Package nodes are structural grouping nodes when package scope is enabled, not automatic replacements for their File Nodes.
- Future package expansion or simplification should be defined separately if it does not follow normal **Collapse** rules.
- Core default **Edge Types** include imports, type imports, re-exports, calls, inherits, references, tests, loads, and nests.
- Core default **Edge Types** mostly come from Tree-sitter baseline analysis, the **Markdown Plugin**, and structural nesting.
- Plugins can contribute additional **Edge Types**.
- **Graph Scope** should show **Edge Type Capabilities** from the union of active **Edge Type Capability Providers** for the CodeGraphy Workspace, not from a hardcoded language list or only from currently observed Edges.
- **Graph Scope** Edge Type Capability decisions should use the indexed workspace **Relationship Graph** before **Depth Mode**, **Filter Settings**, **Search**, or other view narrowing stages are applied.
- **Graph Scope** does not need to explain which providers made an **Edge Type Capability** applicable; user-facing Edge Type help should explain what the Edge Type means.
- **Graph Scope** should show disabled Edge Type controls while the CodeGraphy Workspace has no Graph Cache because there is no indexed relationship source yet. Any existing Graph Cache is enough to enable Edge Type controls, even when **Graph Cache Sync** still needs to catch up. A short tooltip such as "Index workspace to enable Edge Type controls" is enough explanation for the disabled state.
- A **Nests Relationship** points from the container to the contained node, and a folder node should usually only participate in **Nests Relationships**.
- **Edge Direction** points from the node initiating the relationship to the node being related to.
- **Downstream** only describes direction through the graph; it does not describe whether the relationship is a dependency, reference, link, or another edge type.
- A **Dependency** is only present when an **Edge Type** specifically says one node needs another; many relationships are not dependencies.
- **Relationship Source** is provenance for a relationship and is distinct from the source node in **Edge Direction**.
- **Depth Mode** narrows attention to nodes within a configured edge-hop distance of the **Focused Node**.
- **Depth Mode** is a user-facing **Graph View** aid applied after the **Visible Graph** pipeline; agent **Graph Queries** do not need to apply it by default.
- **Depth Mode** does not depend on **Edge Type** when counting edge hops.
- Nodes outside the configured depth may remain visible but faded, preserving graph context while reducing focus noise.
- The **Active File** and **Focused Node** are linked for File Nodes: opening a file in VS Code should focus its node, and selecting a File Node should preview or open it in VS Code.
- Folder, package, and plugin nodes can be **Focused Nodes**, but they do not open as files in VS Code.
- Single-clicking a file node should select, focus, and **Preview File**.
- Double-clicking a file node should select, focus, and **Open File** as a persistent tab.
- Single-clicking a non-file node should select and focus it without opening a file.
- Right-clicking an unselected node should select that node for **Context Selection** but should not preview or open it.
- Right-clicking a node that is already part of a multi-node selection should keep the multi-node **Context Selection** and open the **Graph Context Menu** for that selected group.
- Right-clicking a single node can switch the **Focused Node** to that node; right-clicking a selected group member should keep the existing **Focused Node** unchanged.
- A **Graph Context Menu** is opened from the current **Context Selection** and should present actions that match that selection's target type.
- A **Graph Context Menu** action should execute against the **Context Selection** snapshot that opened the menu, even if the live graph selection changes before the action runs.
- A **Graph Context Menu** action that no longer matches its opening **Context Selection** snapshot should not run.
- Graph Context Menu action availability can be decided by an explicit menu decision model; that model owns which actions appear, not right-click selection mechanics.
- A multi-node **Context Selection** should only show **Graph Context Menu** actions that can apply to every selected node, unless a mixed-selection action has been explicitly defined.
- Built-in actions and plugin contributions should follow the same **Graph Context Menu** selection rules.
- A single **Folder Node** **Graph Context Menu** can offer child creation actions such as `New File...` and `New Folder...`; those actions target the selected folder.
- A **File Node** **Graph Context Menu** stays file-focused and should not offer child creation actions by default.
- Creating an empty directory from a **Folder Node** action should make that directory visible as a **Folder Node** after refresh or reindex.
- Undoing a folder created from a **Folder Node** action should move the folder to trash only when it is still empty.
- **Depth Mode** should use one **Focused Node**; if multi-selection conflicts with depth behavior, choose one selected node as the focus.
- **Collapse** follows edge direction outward from the collapsed node and absorbs downstream relationship nodes.
- Incoming edges to a **Collapsed Node** remain visible and target the collapsed marker.
- **Collapse** does not absorb a downstream node that is still related to by a visible node outside the collapsed subgraph.
- **Boundary Paths** stay visible so collapse does not invent false direct edges or break existing relationships to shared relationship targets.
- **Collapse Projection** runs after the **Visible Graph** exists because users need a rendered graph before deciding what to collapse.
- Any delete action requires confirmation.
- Projected cross-boundary **Edges** with the same visible source, visible target, and **Edge Type** render as one aggregated edge that preserves the original edge list for inspection.
- Projected cross-boundary **Edges** with different **Edge Types** remain visually distinct.
- Active marquee selection shows a visible desktop-style selection rectangle while the user click-drags.
- A selected **Folder Node** can be a filesystem destination for creating a new file or folder.
- The custom graph renderer handles WebGPU drawing and WebAssembly physics/layout for the graph produced by **Collapse Projection**. The VS Code Extension owns its UI, settings, persistence, plugins, and interaction controls.
- **Filter** applies persistent include/exclude criteria to graph consideration; **Collapse** keeps important graph items available behind a collapsed node.
- **Indexing** starts with **File Discovery**, then runs **Tree-sitter Analysis**, then **Plugin Analysis**, then **Graph Projection**.
- The **Tree-sitter Runtime** alone does not create **Relationships**; CodeGraphy needs **Core Tree-sitter Language Coverage** or **Plugin Analysis** to produce useful graph data for a language.
- A language has **Core Tree-sitter Language Coverage** when the **Core Package** bundles its grammar, maps its file extensions, and extracts baseline relationships that project into the **Relationship Graph**.
- **Core Tree-sitter Language Coverage** should be depth-first: a smaller set of languages with meaningful baseline relationships is better than a broad set of parser-only languages.
- **Core Tree-sitter Language Coverage** should reuse shared Tree-sitter analysis code where languages follow the same parser-backed patterns, keeping language-specific code small.
- When a language or ecosystem needs complex project-aware semantics, shallow **Core Tree-sitter Language Coverage** can provide baseline relationships while deeper support belongs in **Plugin Analysis**.
- TypeScript `compilerOptions.paths` is **Project-Aware Analysis Semantics** and belongs in the TypeScript/JavaScript plugin path, not the always-on Core Tree-sitter JS/TS resolver.
- Structured data and styling formats such as JSON and CSS are outside **Core Tree-sitter Language Coverage** unless a separate relationship model is defined for them.
- C and C++ **Core Tree-sitter Language Coverage** should push generic Tree-sitter AST analysis as far as it can honestly go: local include relationships, useful code symbols, examples, and docs. Full compiler include-path semantics, macro expansion, templates, conditional compilation, and other language-specialized compiler models are deeper **Project-Aware Analysis Semantics** for optional **Plugin Analysis**, not always-on Core behavior.
- Language example workspaces for **Core Tree-sitter Language Coverage** should feel like small real projects rather than one-off feature samplers. File-level **Edges** should make the first graph useful, while Symbol Nodes can add detail for users who enable symbol scope.
- The C example workspace should stay basic, clean, and human-readable. A tiny logger project is a good fit because headers, source files, structs, enums, typedefs, and cross-module calls can appear naturally without turning the example into a C syntax museum.
- **Graph Projection** produces the **Relationship Graph** data that later flows through **Graph Scope**, **Filter**, **Search**, and view settings.
- The **Graph Cache** keeps indexed analysis facts unscoped. A Graph View projection may skip building disabled high-cardinality **Node Types**, such as Symbol Nodes when **Symbol** is off in **Graph Scope**, while leaving the cached facts available for **Graph Query** and for turning that scope back on.
- **Graph Cache Enrichment** should be lazy for expensive graph facts: cache baseline File Nodes and file-level Edges first; when **Graph Scope** or a plugin toggle enables an expensive tier such as Function Symbols, compute and append only that missing tier. Turning that scope or plugin off should leave its enriched facts in **Graph Cache** so turning it back on can reuse cached work and only process stale or missing entries.
- **Graph Cache** stores indexed graph data so reopening the CodeGraphy Workspace does not require full **Indexing**.
- **Live Updates** keep the **Graph Cache** and graph data current as files change.
- **Graph Cache Sync** keeps a readable but out-of-date **Graph Cache** useful by rendering cached graph data first, then updating it in the background.
- Any graph-changing update from added files, renamed files, changed code, or settings that affect graph data should be saved to **Graph Cache**.
- **CodeGraphy Agent Skill** teaches an agent to run **Indexing** when entering a workspace whose cache it does not trust and after relevant workspace changes, then use the narrowest bounded **Graph Query CLI** command.
- Agents do not call status before every **Graph Query**. Their task context determines when cached knowledge may have changed, and repeated **Indexing** is expected to be inexpensive because Core reuses compatible cached analysis.
- **Graph Query CLI** commands do not silently run **Indexing**. Indexing and querying are separate, explicit operations so agents can avoid hidden work and redundant round trips.
- Changed paths, invalidation reasons, and cache reconciliation detail are Core diagnostics rather than normal agent context.
- **Graph Query CLI** reports use the **Relationship Graph**, not only the **Visible Graph**, and can apply **Graph Scope**, **Filter**, **Search**, and strict result limits to reduce noise.
- A **Graph Query** is not a VS Code **View**; it is a narrowed agent-facing result from **Relationship Graph** data.
- **Graph Queries** should reuse **Graph Scope**, **Filter**, **Search**, sorting, and pagination semantics instead of introducing CLI-specific equivalents for the same graph narrowing stages.
- **Refresh Graph** and **Re-index Workspace** should be distinct UI actions.
- **Refresh** only restarts graph physics and does not process source data.
- **Re-index** reruns **Indexing**, updates graph data, persists it to **Graph Cache**, and then **Refreshes** the graph.
- The Graph View can show `Loading graph...` before the first graph render for a webview page. After the first render, later **Graph Cache Sync**, **Live Update**, or **Re-index** work should keep the current **Visible Graph** rendered and use graph-local progress.
- CodeGraphy has one primary **View**: the **Graph View**.
- The **Graph View** contains the **Visible Graph**, search, filters, popups, settings UI, and overlay controls.
- The **Visible Graph** is graph data shown inside the **Graph View**, not the whole view.
- **VS Code Theme Integration** is the top UI rule: extension chrome should inherit the active VS Code theme through CodeGraphy/shadcn semantic tokens before applying CodeGraphy-specific styling.
- UI cleanup should establish the VS Code token bridge and local CodeGraphy UI-kit primitives before reshaping individual surfaces such as the **Graph Tool Rail**, **Search**, **Filter**, **Settings**, and **Graph Panels**.
- The existing `components/ui` layer should follow shadcn's copy-and-own model: generated Radix/shadcn source lives in the repo, CodeGraphy owns and customizes it, and feature code may import from `components/ui` as the local CodeGraphy UI kit. Do not create a separate wrapper layer just to keep shadcn files pristine.
- CodeGraphy should keep the existing root `components.json` and `@/...` alias for shadcn configuration because the **VS Code Extension** is currently the only UI owner. Do not introduce package imports or a shared UI package until another workspace consumes CodeGraphy UI components.
- The first `components/ui` cleanup should prioritize token and theming correctness in existing primitives. Higher-level primitives such as graph rail buttons, panel sections, field rows, and search/filter chrome should be added only as each surface migrates and proves the need.
- Implementation order after token and primitive cleanup is agent-owned and may change as dependencies become clear. The product requirement is that all VS Code Extension UI surfaces converge on the same VS Code token bridge and local CodeGraphy UI kit, including **Graph Stage** chrome, graph rendering colors, **Search**/**Filter**, **Graph Tool Rail**, **Settings**, **Graph Panels**, and **Legend**.
- UI cleanup is done only when light, dark, high-contrast, and red/accent-heavy themes have been verified; UI chrome colors come from the active VS Code theme through the token bridge rather than hardcoded values; common controls use shared `components/ui` primitives; graph rendering consumes resolved CSS-token colors; and before/after screenshots cover **Graph View** and key open-panel states.
- UI cleanup verification should combine lightweight automated checks for token plumbing and hardcoded-color regressions with screenshot review for visual judgment in light, dark, high-contrast, and red/accent-heavy themes. Screenshot anchors are Solarized Light for light, GitHub Dark for dark, High Contrast for high contrast, and Red for the red/accent-heavy theme. The screenshot pass should include the default **Graph View** plus the **Legend** with default content as the representative panel screenshot so panel chrome is checked without seeded user data or multiplying every panel across every theme.
- Automated hardcoded-color checks should scan all production webview TSX/CSS, not only changed files. UI chrome should not have hardcoded colors; it should use the VS Code token bridge or CodeGraphy `--cg-*` aliases. Hardcoded colors are acceptable only when they are semantic **Graph Data Color**, such as node, edge, Legend, node-type, edge-type, plugin, or graph-data palette values, and should not be used for component chrome.
- The VS Code token bridge should have two layers: shadcn-compatible semantic tokens for generic controls, and a small CodeGraphy `--cg-*` alias layer for graph-specific surfaces and repeated layout chrome such as the **Graph Stage**, **Graph Tool Rail**, and **Graph Panels**.
- Canvas and graph-rendering code should receive concrete colors resolved from CodeGraphy CSS tokens on theme changes, rather than branching internally on only `light`, `dark`, or `high-contrast` theme kinds. Theme kind should remain only as a compatibility hint for graph-data color adjustment.
- **Graph Data Color** is allowed to diverge from VS Code chrome colors when it encodes graph meaning, but it must remain legible on the themed **Graph Stage**.
- Default **Graph Data Colors** for nodes, edges, and similar graph concepts may be small hardcoded semantic palettes rather than theme-derived chrome colors. Those colors are graph data, not UI chrome, and the graph appearance adapter is responsible for making them legible on the themed **Graph Stage**.
- Hardcoded **Graph Data Color** palettes should be centralized in graph, Legend, or Plugin default modules. Renderers and TSX components should consume named graph data colors or graph appearance-model outputs instead of defining convenient local graph colors.
- When **Graph Data Color** has poor contrast on the themed **Graph Stage**, CodeGraphy should preserve the semantic color when possible and add theme-aware support treatments such as outlines, label colors, selection rings, or edge strokes. Mutating graph-data colors should be a final readability fallback.
- Graph contrast and readability decisions should live in one graph theme or appearance adapter that receives resolved CodeGraphy CSS tokens and **Graph Data Colors**, then outputs concrete render colors and support treatments. Individual renderers should consume that appearance model instead of owning separate contrast rules.
- The **Graph Stage** should be a VS Code-derived graph surface, not a hardcoded dark or light canvas.
- The top search surface is for temporary **Search** and find-style controls; it should not be moved into the **Graph Tool Rail**.
- Search option controls such as match case, whole word, and regex should stay visible inline in the top search surface, styled as VS Code-like search option buttons rather than hidden in a popover.
- **Filter** access should stay attached to the top search surface but remain visually distinct from temporary **Search** options; the trigger should use icon-and-count chrome, with the full Filter label/title inside the popup or expanded surface.
- The top **Search** field and expanded **Filter** surface should share one VS Code-like container rather than appearing as detached bands.
- The shared **Search** and **Filter** container should use the same uniform CodeGraphy shadcn/Radix density as the rest of the UI while borrowing VS Code Search structure and theme integration; do not introduce a special compact density for this surface.
- **Search** and **Filter** controls should reuse the same local CodeGraphy Button and Input variants as panels and settings. The shared top container may define its own layout wrapper and token bridge, but it should not fork component variants for this surface.
- The **Filter** popup or expanded surface should borrow from VS Code Search by presenting Include and Exclude sections, while keeping those values as persistent **Filter Settings** rather than temporary **Search** text.
- The first **Filter Setting** UI should aim for feature parity with VS Code Search's include/exclude pattern fields, not graph-aware criteria. Node and edge type eligibility remains **Graph Scope**, plugin enablement remains **Plugins**, and temporary text matching remains **Search**.
- The **Filter** surface should expand inline under the top search surface, like VS Code Search, and provide a clean rule-management area for built-in, plugin-contributed, and custom **Filter Rules**.
- Expanding the shared **Search** and **Filter** container should push the **Graph Stage** down, not overlay it, but the expanded **Filter** area should have a bounded max height with internal scrolling so the graph remains the center focus.
- The expanded **Filter** area's bounded max height should be responsive to the **Graph View** height rather than a single fixed size.
- Built-in and plugin-contributed **Filter Rules** are source-owned and should not be directly editable. Users can enable or disable them; editing creates a custom user-owned **Filter Rule Override** or copy.
- Disabled **Filter Rules** should stay in place within their Include or Exclude list and use normal disabled styling, such as lower-contrast text and subdued controls, instead of moving into a separate disabled section.
- **Filter Rule** origins should use both subtle visible labels and tooltips: small labels such as Default, a plugin name, or User appear when row space allows, while the tooltip always gives the full source.
- Expanded Include and Exclude sections should each keep an always-visible inline input for adding custom **Filter Rules**, matching VS Code Search's pattern-entry feel rather than hiding rule creation behind an add button.
- The **Filter** trigger count should show all enabled **Filter Rules**, regardless of origin, because those are the rules currently affecting the graph.
- The expanded **Filter** surface should break enabled-rule counts down by Include and Exclude sections, while the collapsed trigger keeps a single total count.
- The expanded or collapsed state of the **Filter** surface should be remembered as UI state across **Graph View** sessions; it is not workspace-local graph behavior and should not persist in `.codegraphy/settings.json`.
- Include and Exclude rule-list sections inside the expanded **Filter** surface should default collapsed.
- Include and Exclude rule-list section open or closed state should also be remembered as UI state across **Graph View** sessions, not persisted in `.codegraphy/settings.json`.
- Adding an Include or Exclude **Filter Rule** should require expanding that section first; collapsed section headers are quiet summaries, not editing surfaces.
- Collapsed Include and Exclude section headers should show enabled-rule counts plus subtle status markers for conflicts or invalid drafts. They should not surface neutral per-rule no-match metadata such as "0 matches".
- Conflict and invalid-draft markers in collapsed Include and Exclude headers should be icon-only with tooltips; fuller text feedback belongs in expanded rows.
- **Filter Rules** should stay in one uniform rule list within each Include or Exclude section, with row-level origin labels, rather than being grouped under separate origin headers.
- **Filter Rules** should order active rules first and disabled rules after them, while preserving source/default order inside each group.
- Custom user **Filter Rules** should appear at the top of the active rule group because they are higher-intent and more likely to be edited again; source-owned active rules stay below them in stable source/default order.
- Within custom user **Filter Rules**, newest rules should appear first.
- Custom user **Filter Rules** should not support manual reordering in the first slice because rule order has no matching semantics.
- The expanded **Filter** surface should offer a **Restore Defaults** action, not a vague clear action. Restore Defaults removes custom user **Filter Rules** and **Filter Rule Overrides**, then restores built-in and plugin-contributed **Filter Rules** to their source-owned default enabled states.
- **Restore Defaults** should require a small confirmation dialog because it removes custom filter work.
- Custom user **Filter Rules** should edit inline in their row for simple path/glob pattern changes, preserving the lightweight VS Code Search feel.
- Inline **Filter Rule** edits should apply on Enter or blur, and Escape should cancel the edit, so partial pattern typing does not continuously reshape the graph.
- Always-visible Include and Exclude add inputs should create a new custom **Filter Rule** only on Enter. Blur should not create a rule, even when the draft pattern is valid, because accidentally leaving the input should not mutate persistent filters.
- Add-input drafts should survive collapsing and reopening the expanded **Filter** surface during the current **Graph View** session, but drafts are UI state only and should never persist to `.codegraphy/settings.json` until Enter creates a **Filter Rule**.
- A valid **Filter Rule** that currently matches no graph items is allowed because it may be preparing for future files or another branch. No-match is not the same as invalid pattern syntax.
- A **Filter Rule** should be rejected only when it is empty or the chosen matcher cannot parse it. Weird but parseable patterns are allowed, even if they match nothing.
- The expanded **Filter** surface should show subtle per-rule match metadata such as "0 matches" or "12 matches". Match metadata is neutral information, not a warning when the count is zero.
- **Filter Rule** matching should use one shared VS Code-like matcher across discovery, **Graph View** filtering, and **Graph Query**, so Include and Exclude behavior stays predictable everywhere.
- Always-visible Include and Exclude add inputs should accept comma-separated pattern lists for VS Code parity, then create one custom **Filter Rule** per pattern on Enter.
- When a comma-separated add input contains a mix of valid and invalid patterns, valid patterns should become custom **Filter Rules** and invalid entries should remain in the draft with inline feedback.
- Duplicate **Filter Rules** in the same Include or Exclude section should not create another row. The UI should focus the existing matching row and show subtle "Already exists" feedback.
- An empty Include section means include everything still eligible after **Graph Scope**. Include rules narrow that default set only when at least one Include **Filter Rule** is enabled.
- If all Include **Filter Rules** are disabled, Include behaves the same as empty Include: disabled rules do not participate, so everything still eligible after **Graph Scope** passes through to Exclude.
- Disabled Exclude **Filter Rules** are fully inert: they do not exclude graph items, do not count in the collapsed **Filter** trigger, and only remain visible as disabled rows in the expanded **Filter** surface.
- Source-owned **Filter Rule** enable/disable state should be persisted by stable source and rule id, not by raw pattern text, so CodeGraphy or plugin updates can change rule patterns without losing the user's toggle choice.
- Custom user **Filter Rules** should persist generated stable ids as their row identity; pattern text is editable content, not the rule's durable identity.
- If the same pattern or graph item is matched by both Include and Exclude **Filter Rules**, Exclude wins. The UI should show a subtle conflict hint on the affected rows so users understand why the included pattern is still excluded.
- The **Graph Tool Rail** is for high-frequency graph tools that change the current working view or open graph-local panels.
- The **Graph Tool Rail** should be grouped and icon-first, with menus, popovers, or panels for dense multi-choice controls such as layout, node sizing, and **Graph Scope**.
- **Graph Tool Rail** groups should use subtle mixed separators: compact spacing plus low-contrast 1px lines between major groups. Lifecycle actions such as **Re-index Workspace** can be distinct without visually floating alone.
- Compact multi-choice tools such as layout and node sizing should open small **Graph Tool Rail** popovers with compact icon-and-label choices, not large right-side panels. Their rail buttons should show the currently selected mode icon, and the current choice inside the popover should use a subtle active row plus a checkmark.
- Conditional compact-popover choices should remain visible but disabled with a tooltip or short reason when unavailable, instead of disappearing.
- **Graph Scope** controls should open through one **Graph Scope Panel** that combines **Node Type** and **Edge Type** scope controls instead of separate unrelated Nodes and Edges panels.
- Color swatches in the **Graph Scope Panel** identify what a **Node Type** or **Edge Type** looks like while toggling scope; they are read-only circles, not color-editing controls.
- The **Legend** should remain a direct **Graph Tool Rail** panel button because it owns graph semantic styling, not general display behavior.
- Indexing actions such as **Re-index Workspace** should remain a direct **Graph Tool Rail** control because they are primary graph lifecycle actions.
- Export actions should live as an Export section inside **Settings**, not as primary **Graph Tool Rail** buttons and not under a vague "More" label, because they output graph data rather than shape the working graph view.
- **Plugins** should remain a direct **Graph Tool Rail** panel button because plugins change what graph concepts and controls exist, but it belongs with configuration/system controls rather than active graph-working mode controls.
- **Settings** should remain a direct **Graph Tool Rail** panel button, visually separated near the bottom, and should not absorb controls with clearer homes such as **Graph Scope** or **Legend**. It may include secondary action sections such as **Export** even though those actions are not persisted Settings.
- **Settings** should be organized by intent with **Display Settings**, Forces, Performance, and Export sections.
- Forces should remain a first-class **Settings** section, collapsed by default rather than hidden under Advanced.
- **Settings** sections should default collapsed and remember their open or closed state as UI state the next time Settings opens; section collapse state is not workspace-local graph behavior.
- **Graph Panels** should be content-driven in width; content-heavy surfaces such as **Legend** may be wider, but the row layout should still be reviewed for clarity.
- The **Legend** panel may remain wider than ordinary **Graph Panels** because it is an editing surface, but Legend rows should be simplified with clearer hierarchy, compact actions, and advanced details expanded only when needed.
- **Graph Tool Popovers** should open near their rail button; larger **Graph Panels** such as **Graph Scope Panel**, **Legend**, **Plugins**, and **Settings** should stay right-side panels.
- Only one **Graph Tool Popover** should be open at a time. Opening a **Graph Panel** should close open popovers, but opening a popover should not have to close the current **Graph Panel**.
- Right-side **Graph Panels** should remain mutually exclusive; only one should be open at a time.
- A **Graph Tool Rail** button that owns the open **Graph Panel** should show an active state using subtle tint plus a small accent indicator rather than a heavy filled button.
- Compact choice rail buttons such as layout and node sizing should not show active panel styling merely because a value is selected; the current icon carries the selected value.
- **Graph Stage Corner Controls** are for viewport navigation and canvas/window actions, not settings or graph-scope controls.
- **Display Settings** are for persistent visual preferences and lower-frequency view behavior, especially controls with sliders or supporting fields.
- **Depth Mode** belongs under **Display Settings** because it combines a mode toggle with depth controls.
- **Depth Mode** does not need a **Graph Tool Rail** status indicator in the first UI cleanup; any future status should live as subtle **Graph Stage** context instead.
- `maxFiles` is a Performance setting, not a **Display Setting**.
- **Graph View Zoom** is a view interaction only; it does not change **Relationship Graph** data, **Graph Scope**, **Filter**, or **Search**.
- **Continuous Zoom** should use the same zoom step as repeated single zoom actions.
- **Graph Query** behavior should live in a Core Package **Module** so the **Graph View** Adapter and **Graph Query CLI** use the same **Graph Scope**, **Filter**, **Search**, sorting, pagination, structural nodes, and relationship evidence semantics.
- The **Graph Query** **Module** should return the graph data callers ask for while exposing opt-in query stages such as **Graph Scope** Node Type and Edge Type enablement, **Filter** conditions, **Search**, sorting, and pagination.
- **Graph Scope** query behavior is about whether Node Types such as files, folders, and packages, and Edge Types such as imports, calls, tests, and nests are enabled; visual styling such as node colors belongs to the **Graph View** Adapter.
- Core **Edge Types** should use canonical core ids such as `nests`; namespaced ids are appropriate for plugin-owned **Edge Types**.
- A **Graph Query** configuration should keep stage inputs together: `scope.nodes`, `scope.edges`, `filters`, `search`, `sort`, `limit`, and `offset`.
- **Show Orphans** remains a boolean **Graph View** presentation setting, not a **Graph Query** configuration field.
- Structural **Folder Node** and **Workspace Package** projection belongs inside the **Graph Query** **Module**, so the **Graph View** Adapter and **Graph Query CLI** use the same structural graph behavior.
- When callers opt in to multiple query stages, the **Graph Query** **Module** must apply them in canonical order so stages compound correctly: **Graph Scope** before **Filter**, **Filter** before **Search**, then sorting and pagination.
- The **Core Package** and **VS Code Extension** together provide the out-of-box Relationship Graph product and should work for most users without optional plugins.
- The **Core Package** uses Tree-sitter coverage and the bundled **Markdown Plugin** to provide useful default analysis; the **VS Code Extension** adds visualization and Material icon styling.
- A **Plugin** can add **Nodes**, **Node Types**, **Relationships**, **Edge Types**, Symbol Nodes, preset filters, and relationship evidence.
- A **Plugin** can expand existing core **Edge Type Capabilities** for a workspace, contribute plugin-owned **Edge Types**, or do both.
- A **Plugin** can analyze files by reading lines, using AST tooling, or any other analysis approach appropriate to its language or framework.
- Graph View hover metadata should name Plugins only from plugin-owned graph facts that touch the hovered node, not from file support, broad analysis participation, or Core Tree-sitter Language Coverage. If multiple Plugins contribute graph facts touching the node, the hover may list each distinct Plugin name.
- A **Plugin Package** is the packaging route for third-party plugins.
- **Built-in Plugins** in this monorepo are examples and fast-development plugins, not required dependencies unless explicitly installed or bundled by the Core Package.
- The **Markdown Plugin** is installed with `@codegraphy-dev/core` and enabled by default for new CodeGraphy Workspaces, but users can still toggle it off.
- A **Settings Control** changes a **Setting**; it is not a separate persisted concept.
- **Settings** are saved workspace-locally under `.codegraphy/settings.json` so graph preferences survive between sessions.
- **Graph Scope**, **Filter Setting**, **Display Setting**, **Verbose Diagnostics**, **Favorite**, and **Legend Entry Toggle** are settings because they are saved between sessions.
- The **Verbose Diagnostics** persisted settings key is `verboseDiagnostics`.
- **Verbose Diagnostics** takes effect immediately for newly occurring diagnostics after the Setting changes. Restarting VS Code is only required when a support workflow needs startup lifecycle diagnostics.
- **Verbose Diagnostics** should expose Core Package diagnostics through the active **CodeGraphy Interface**: VS Code Developer Tools for the **VS Code Extension** and stderr diagnostic output for **CodeGraphy CLI**.
- The persisted **Verbose Diagnostics** Setting controls only the **VS Code Extension** interface. **CodeGraphy CLI** should opt into verbose diagnostics per invocation so scripts and agent command calls stay quiet by default.
- **CodeGraphy CLI** should accept `--verbose` consistently across commands, even if some commands have fewer diagnostic events than others.
- **Verbose Diagnostics** should report factual Core Package state, VS Code Extension lifecycle state, decisions, counts, and execution context. They should not include suggested next actions or prescriptive guidance, though each interface may format the same facts for its output sink.
- **Verbose Diagnostics** events should carry stable area and event identifiers so humans can grep logs and agents can reason over diagnostics without parsing prose.
- **Verbose Diagnostics** context should be JSON-serializable plain data so the same event can render consistently through the VS Code Extension and CodeGraphy CLI.
- **Verbose Diagnostics** should prefer workspace-relative paths when a CodeGraphy Workspace root is known. Absolute paths should be limited to explicit workspace roots, external package locations, or existing error surfaces where the absolute path is already part of the reported failure.
- **Verbose Diagnostics** should include timing and duration facts for phase boundaries when they are cheap and reliable to measure.
- **Verbose Diagnostics** should include operation or request identifiers for multi-event indexing, query, cache sync, and lifecycle operations so interleaved diagnostics can be correlated.
- **Verbose Diagnostics** may include compact snapshots of behavior-shaping inputs, such as enabled plugin ids/packages, disabled plugin ids, Graph Scope counts, and filter counts. They should not dump complete settings objects.
- **Verbose Diagnostics** should wrap important existing errors and warnings with structured diagnostic context while preserving the existing error or warning behavior.
- **Verbose Diagnostics** should stay high-signal even when verbose: prefer operation boundaries, decisions, state transitions, summaries, timings, and structured error context over repeated hot-loop or per-item logs.
- **Verbose Diagnostics** has one curated verbose mode, not multiple verbosity levels.
- Obvious non-error lifecycle logs may move behind **Verbose Diagnostics** when they are noisy in normal use, but this should be selective rather than a blanket migration of all existing logs.
- User-facing troubleshooting docs and changesets should use the name **Verbose Diagnostics** consistently.
- **Verbose Diagnostics** may log event names, lifecycle phases, counts, plugin or package ids, cache freshness decisions, and workspace-relative paths when they help support diagnose ordering and state. It should avoid logging file contents and avoid absolute paths unless an existing error path already reports one.
- **Filter Settings** are made of **Filter Rules** whose enabled state and user customizations must be understandable when rules come from defaults, plugins, or custom user entries.
- Custom user **Filter Rules** and **Filter Rule Overrides** can be edited or removed; source-owned built-in and plugin-contributed **Filter Rules** can be toggled but not removed from their source.
- **Display Settings** change presentation and view behavior; they do not change graph eligibility like **Graph Scope** or **Filter Setting**.
- **Search** is temporary and should not be cached like a **Filter Setting**.
- **Collapse** is temporary for now and should not be cached like a **Setting**.
- The **Legend** themes graph nodes and edges.
- The **Legend** owns editing Graph Data Color, Legend Entries, and Legend Layers; **Graph Scope** only controls inclusion.
- The **Legend** is separate from **Display Settings**; it changes graph semantic styling and rule layers, not only presentation behavior.
- **Legend Layers** apply in this order: core defaults, plugin defaults, custom user entries.
- Custom user **Legend Entries** apply last and override core or plugin defaults.
- A **Legend Entry Toggle** controls whether a **Legend Entry** applies its styling.
- Turning off a **Legend Entry Toggle** does not hide matching nodes or edges; those graph items fall back to lower-priority styling.
- Custom **Legend Entries** can be deleted; core and plugin defaults are not deleted like user entries.
- Material Icon Theme styling currently belongs to the **VS Code Extension**, but it may become a plugin theming source later.
- Graph theming should remain compatible with VS Code themes.
- A **Graph Export** writes the current **Visible Graph**; an **Index Export** writes cached analysis data for software or agent consumption.
- **Export** is a secondary output action in the **Graph View**, not a primary graph-working control, and it can live as an action section inside **Settings**.
- **Export** is not **Graph Cache** and is not **Settings** persistence.

## Example dialogue

> **Dev:** "Should we call this a dependency graph?"
> **Domain expert:** "No. Dependencies are one relationship type; the product is a **Relationship Graph** because it shows broader relationships between files."
>
> **Dev:** "If one markdown file links to another, is the target a dependency?"
> **Domain expert:** "Not necessarily. The edge shows a directed **Relationship** or communication; it is only a **Dependency** if the **Edge Type** specifically means one node needs the other."
>
> **Dev:** "Does downstream mean dependency?"
> **Domain expert:** "No. **Downstream** only means following edge direction. The **Edge Type** explains what that direction means."
>
> **Dev:** "Which graph does the user see?"
> **Domain expert:** "The **Visible Graph**. It starts from the **Relationship Graph**, applies **Graph Scope** into a **Scoped Graph**, removes ignored noise into a **Filtered Graph**, narrows temporary queries into a **Searched Graph**, then applies view settings."
>
> **Dev:** "If the chain is `A -> B -> C -> D` and I collapse `B`, what remains?"
> **Domain expert:** "`A -> B*`. `B*` is a **Collapsed Node** representing `B` plus its downstream relationship nodes `C` and `D`."
>
> **Dev:** "In `A -> B -> C -> D <- E`, if `B` and `E` are collapsed, why does `C` stay visible?"
> **Domain expert:** "`D` is shared, so `C` is a **Boundary Path** explaining how `B*` reaches `D` without inventing a false direct edge."
>
> **Dev:** "Is Depth Mode a separate view?"
> **Domain expert:** "No. **Depth Mode** is a local focus mode in the **Graph View**. It follows the **Focused Node** and uses edge-hop distance to emphasize nearby nodes."
>
> **Dev:** "What should a single click on a file node do?"
> **Domain expert:** "It should select, focus, and **Preview File**. Double-click should select, focus, and **Open File** as a persistent editor tab."
>
> **Dev:** "Should right-clicking a file node preview it?"
> **Domain expert:** "No. Right-clicking an unselected node should select it for **Context Selection**, but not preview or open it."
>
> **Dev:** "What happens when a user clicks Index Workspace?"
> **Domain expert:** "**Indexing** runs **File Discovery**, **Tree-sitter Analysis**, **Plugin Analysis**, and **Graph Projection**, then saves the result in the **Graph Cache** for reuse and **Live Updates**."
>
> **Dev:** "Is Refresh the same as Re-index?"
> **Domain expert:** "No. **Refresh** restarts graph physics. **Re-index** rebuilds graph data, saves it, then refreshes the graph."
>
> **Dev:** "Does the CodeGraphy Agent Skill build its own graph?"
> **Domain expert:** "No. The **CodeGraphy Agent Skill** teaches agents to use Core-owned **Indexing** and **Graph Query CLI** commands. The **Core Package** builds and queries the graph."
>
> **Dev:** "Is the current collapsed graph a view?"
> **Domain expert:** "No. Use **Visible Graph** for graph state. A **View** is the VS Code UI container, such as the **Graph View**."
>
> **Dev:** "Does someone need to fork CodeGraphy to add a new language relationship?"
> **Domain expert:** "No. They can build a **Plugin Package** that integrates with `@codegraphy-dev/core` and contributes new graph understanding."
>
> **Dev:** "Are graph controls different from settings?"
> **Domain expert:** "Usually no. A UI control changes a **Setting**, and the **Setting** is the persisted workspace-local value."
>
> **Dev:** "If I turn off the Godot `*.gd` Legend Entry, do GDScript files disappear?"
> **Domain expert:** "No. The **Legend Entry Toggle** only disables that styling, so matching nodes fall back to lower-priority styling."

## Flagged ambiguities

- "dependency graph" is too narrow for the main product concept; resolved: use **Relationship Graph** for the graph users interact with.
- "force graph" is an obsolete implementation label; resolved: use **Relationship Graph** for the domain object, **Graph View** for the product surface, and custom graph renderer or graph physics/layout for the implementation mechanics.
- "relationship" is broader than dependency; resolved: use **Relationship** for the general concept and **Edge Type** for the category of a concrete rendered edge.
- "dependency" is not generic relationship direction; resolved: use **Dependency** only when the edge type specifically means one node needs another.
- "downstream" is directional only; resolved: it says a relationship exists in that direction, not what kind of relationship the edge represents.
- "connection" is acceptable in conversation as an informal synonym for **Relationship**, but docs and code should prefer **Relationship**.
- Agent access uses the **CodeGraphy Agent Skill** plus **CodeGraphy CLI**; resolved: no separate agent server is part of the current product foundation.
- Cache invalidation detail belongs inside Core reconciliation and diagnostics; resolved: agents explicitly run **Indexing** when they believe cached knowledge may have changed rather than managing a public freshness state machine.
- "package" can be local or external; resolved: use **Workspace Package** when CodeGraphy can read and expand it, and **External Package** when the package is outside the local context and represented as one node.
- "collapse dependents" was ambiguous; resolved: **Collapse** absorbs downstream relationship nodes, not upstream nodes.
- Shared downstream relationship targets stay visible when they are still related to by visible nodes outside the collapsed subgraph.
- When a shared relationship target stays visible, the downstream path to it stays visible as a **Boundary Path**.
- Collapse behavior is not renderer-owned; resolved: CodeGraphy owns **Collapse Projection**, it runs after the **Visible Graph** exists, and the custom graph renderer displays the resulting graph.
- Do not introduce "Collapsed Graph" as a separate pipeline term for now; resolved: the user still sees the **Visible Graph**, updated by **Collapse Projection**.
- "filter" and "collapse" both reduce **Visible Graph** detail but are not synonyms; resolved: **Filter** means persistent include/exclude criteria, while **Collapse** means summarize relevant hidden detail.
- Graph Scope before Filter is load-bearing: disabled **Node Types** and **Edge Types** must be removed before filter criteria are evaluated.
- **Show Orphans** is a final **Graph View** presentation setting because orphan status can only be known after graph data is narrowed for rendering; it is not part of **Indexing** or Core **Graph Query** configuration.
