# CodeGraphy

CodeGraphy visualizes relationships in a codebase as an interactive graph so people can understand how files and related concepts connect.

## Language

### Graph Model

**Relationship Graph**:
The main CodeGraphy graph that shows relationships between files and related codebase concepts.
_Avoid_: Dependency graph, repo graph, workspace graph, force graph

**Node**:
A graph item representing a file, folder, package, or plugin-defined codebase concept.
_Avoid_: Vertex, dot, point

**Node Type**:
The category that describes what kind of thing a node represents, such as file, folder, package, or a plugin-defined type.
_Avoid_: Legend entry, node style

**File Node**:
A node representing a concrete file in the workspace or selected graph revision.
_Avoid_: Folder node, package node

**Folder Node**:
A structural node representing a directory in the workspace.
_Avoid_: File node

**Plugin Node**:
A node contributed by a plugin to represent a language- or framework-specific concept beyond files, folders, and packages.
_Avoid_: Custom node when precision matters

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
_Avoid_: Visibility when referring to the final visible graph, filter when referring to blacklist rules

**Scoped Graph**:
The Relationship Graph after Graph Scope removes disabled **Node Types** and **Edge Types**.
_Avoid_: Visible graph, filtered graph

**Filter**:
To exclude nodes or edges from the graph because they are noise for the current user or repo.
_Avoid_: Collapse

**Filtered Graph**:
The Scoped Graph after filters remove nodes or edges the user does not want considered.
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
A final view setting that keeps or removes Orphan Nodes after orphan status is calculated.
_Avoid_: Filter Setting, Graph Scope

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
The CodeGraphy-owned graph transformation, implemented using the force graph's dynamic graph data update pattern, that responds to user collapse input after the graph has been rendered.
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
The node or nodes targeted by a context menu action.
_Avoid_: Focused Node when right-click target differs from focus

**Preview File**:
To open a file node in VS Code's temporary preview editor state.
_Avoid_: Permanent open, full open

**Open File**:
To open a file node as a persistent VS Code editor tab.
_Avoid_: Preview file

### Indexing And Cache

**Indexing**:
The first-use workflow that discovers repo files, analyzes relationships, lets plugins enrich the result, projects graph data, and caches it for reuse.
_Avoid_: Scanning when analysis and graph projection are included

**File Discovery**:
The indexing stage that reads the workspace file and folder structure into graphable file and folder candidates.
_Avoid_: Indexing when only collecting paths

**Tree-sitter Analysis**:
The built-in analysis pass that uses Tree-sitter to produce baseline relationships before plugin enrichment.
_Avoid_: Plugin analysis

**Plugin Analysis**:
The indexing stage where plugins add or adjust **Nodes**, **Relationships**, and **Edge Types** after the built-in baseline analysis.
_Avoid_: Tree-sitter analysis

**Graph Projection**:
The indexing stage that turns discovered files and analysis results into graph nodes and edges.
_Avoid_: Rendering

**Graph Cache**:
The repo-local LadybugDB graph data at `.codegraphy/graph.lbug` that stores indexed Relationship Graph data for CodeGraphy and agent access.
_Avoid_: Saved index, saved DB, CodeGraphy database when speaking in domain terms

**Live Update**:
An incremental graph update from repo changes after indexing has already produced a cache.
_Avoid_: Re-index, refresh

**Refresh**:
A user-triggered graph rerender that re-runs the force graph simulation without reprocessing graph data.
_Avoid_: Re-index, live update

**Refresh Graph**:
The UI action that refreshes graph layout by rerunning force graph physics without rebuilding graph data.
_Avoid_: Re-index Repo

**Re-index**:
A user-triggered rebuild of graph data that reruns indexing and then refreshes the graph after data updates.
_Avoid_: Refresh when only rerunning graph physics

**Re-index Repo**:
The UI action that rebuilds Relationship Graph data by running indexing, saving the result, and then refreshing the graph.
_Avoid_: Refresh Graph

### Agent Access

**CodeGraphy MCP**:
The local MCP server and CLI that let agents query Relationship Graph data from the Graph Cache and request extension-owned re-indexing when the Graph Cache is missing or cannot answer.
_Avoid_: Agent bridge, MCP indexer, MCP graph

**Graph Query**:
An agent request against Relationship Graph data that can apply Graph Scope, Filter, Search, traversal direction, depth, and result limits before returning graph data.
_Avoid_: View graph, saved graph view, Visible Graph when the result is not the UI-rendered graph

### Views And Timeline

**View**:
A VS Code extension UI container owned by CodeGraphy.
_Avoid_: Graph state, projection, filtered graph

**Graph View**:
The CodeGraphy view where users interact with the Relationship Graph and its surrounding controls.
_Avoid_: Visible graph

**Timeline View**:
The CodeGraphy view where users inspect how the graph changes across git history.
_Avoid_: Git history cache, graph view

**Timeline Snapshot**:
A graph state for a specific commit in the repository's git history.
_Avoid_: Live graph, current workspace graph

**Graph Revision**:
The git revision whose files are used to build the graph being shown.
_Avoid_: Workspace graph, current graph when precision matters

### Plugins And Core

**Core Extension**:
The base CodeGraphy VS Code extension that owns graph data shape, processing, rendering, user features, built-in baseline analysis, styling, caching, and plugin hosting.
_Avoid_: Plugin host only, empty shell

**Plugin**:
A CodeGraphy extension point that piggybacks on the base extension to add or improve analysis, graph types, controls, theming, exports, or UI.
_Avoid_: VS Code extension when referring to the CodeGraphy capability

**Plugin Extension**:
A VS Code extension package that registers a CodeGraphy plugin.
_Avoid_: Plugin when packaging or distribution matters

**Built-in Plugin**:
A plugin developed with CodeGraphy and shipped from the monorepo as part of the current product experience or examples.
_Avoid_: Required plugin

**Markdown Plugin**:
The built-in plugin installed by default with the base CodeGraphy extension and still toggleable like other plugins.
_Avoid_: External markdown extension

### Settings And Styling

**Setting**:
A repo-local persisted preference in `.codegraphy/settings.json` that changes graph behavior, appearance, filtering, or feature state.
_Avoid_: Control when referring to the persisted value

**Settings Control**:
A UI control that changes a Setting.
_Avoid_: Setting when referring only to the UI element

**Filter Setting**:
A persisted Setting that excludes matching graph items from discovery or graph consideration.
_Avoid_: Search, collapse

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

- A **Relationship Graph** is presented through an interactive force graph.
- A **Relationship Graph** contains **Nodes** connected by **Edges**.
- The graph pipeline is **Relationship Graph** -> **Scoped Graph** -> **Filtered Graph** -> **Searched Graph** -> **Visible Graph**.
- **Graph Scope** runs before **Filter Settings** so disabled **Node Types** and **Edge Types** are removed before blacklist-style filters run.
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
- **Depth Mode** should use one **Focused Node**; if multi-selection conflicts with depth behavior, choose one selected node as the focus.
- **Collapse** follows edge direction outward from the collapsed node and absorbs downstream relationship nodes.
- Incoming edges to a **Collapsed Node** remain visible and target the collapsed marker.
- **Collapse** does not absorb a downstream node that is still related to by a visible node outside the collapsed subgraph.
- **Boundary Paths** stay visible so collapse does not invent false direct edges or break existing relationships to shared relationship targets.
- **Collapse Projection** runs after the **Visible Graph** exists because users need a rendered graph before deciding what to collapse.
- The force graph renderer handles layout, physics, and interaction for the graph produced by **Collapse Projection**.
- **Filter** removes graph items from consideration; **Collapse** keeps important graph items available behind a collapsed node.
- **Indexing** starts with **File Discovery**, then runs **Tree-sitter Analysis**, then **Plugin Analysis**, then **Graph Projection**.
- **Graph Projection** produces the **Relationship Graph** data that later flows through **Graph Scope**, **Filter**, **Search**, and view settings.
- **Graph Cache** stores indexed graph data so reopening the repo does not require full **Indexing**.
- **Live Updates** keep the **Graph Cache** and graph data current as files change.
- Any graph-changing update from added files, renamed files, changed code, or settings that affect graph data should be saved to **Graph Cache**.
- **CodeGraphy MCP** reads **Relationship Graph** data from the **Graph Cache** for agent access and does not own **Indexing**.
- **CodeGraphy MCP** should not be limited to the **Visible Graph**; it should query the **Relationship Graph** and allow agent queries to apply **Graph Scope**, **Filter**, and **Search** to reduce noise.
- A **Graph Query** is not a VS Code **View**; it is a narrowed agent-facing result from **Relationship Graph** data.
- **Graph Queries** should reuse **Graph Scope**, **Filter**, and **Search** semantics instead of introducing MCP-specific equivalents for the same graph narrowing stages.
- **Refresh Graph** and **Re-index Repo** should be distinct UI actions.
- **Refresh** only reruns the force graph simulation and does not process source data.
- **Re-index** reruns **Indexing**, updates graph data, persists it to **Graph Cache**, and then **Refreshes** the graph.
- CodeGraphy has two **Views**: the **Graph View** and the **Timeline View**.
- The **Graph View** contains the **Visible Graph**, search, filters, popups, settings UI, and overlay controls.
- The **Visible Graph** is graph data shown inside the **Graph View**, not the whole view.
- **Visible Graph** derivation should live in a pure shared **Module** so the **Graph View** can use it first and **CodeGraphy MCP** can later reuse the same **Graph Scope**, **Filter**, and **Search** semantics for **Graph Queries**.
- The shared **Visible Graph** derivation **Module** should return the core graph data callers need, while exposing opt-in derivation stages that can be enabled by passing stage-specific configuration such as **Graph Scope** Node Type and Edge Type enablement, **Filter** patterns, or a **Search** query and options.
- Shared **Graph Scope** derivation is about whether Node Types such as files, folders, and packages, and Edge Types such as imports, calls, tests, and nests are enabled; visual styling such as node colors belongs to the **Graph View** Adapter.
- Core **Edge Types** should use canonical core ids such as `nests`; namespaced ids are appropriate for plugin-owned **Edge Types**.
- A shared derivation configuration should keep stage inputs together: `scope.nodes`, `scope.edges`, `filter.patterns`, `search.query`, `search.options`, and `showOrphans`.
- **Show Orphans** remains a boolean view setting in derivation configuration.
- Structural **Folder Node** and **Workspace Package** projection belongs inside the shared **Visible Graph** derivation **Module**, so the **Graph View** and later **Graph Queries** use the same structural graph behavior.
- When callers opt in to multiple derivation stages, the shared **Module** must apply them in canonical order so stages compound correctly: **Graph Scope** before **Filter**, **Filter** before **Search**, and **Show Orphans** last.
- The **Timeline View** lets users jump through commits in git history.
- Selecting a **Timeline Snapshot** changes the nodes and edges rendered in the **Visible Graph** inside the **Graph View**.
- **Timeline Snapshots** still flow through the same **Graph Scope**, **Filter**, **Search**, and view setting stages as the current workspace **Relationship Graph**.
- A **Timeline Snapshot** uses a commit as its **Graph Revision** and should show the files and relationships from that commit only.
- The default **Graph Revision** is the current `HEAD` plus working tree state, updated by **Live Updates**.
- The **Core Extension** is the out-of-box Relationship Graph product and should work for most users without optional plugins.
- The **Core Extension** uses Tree-sitter coverage, the bundled **Markdown Plugin**, and Material icon styling to provide a useful default graph.
- A **Plugin** can add **Nodes**, **Node Types**, **Relationships**, **Edge Types**, preset filters, theming, exports, or UI.
- A **Plugin** can analyze files by reading lines, using AST tooling, or any other analysis approach appropriate to its language or framework.
- A **Plugin Extension** is the packaging route for third-party plugins in the VS Code marketplace.
- **Built-in Plugins** in this monorepo are examples and fast-development plugins, not required dependencies unless explicitly bundled.
- The **Markdown Plugin** is bundled by default with the base extension, but users can still toggle it off.
- A **Settings Control** changes a **Setting**; it is not a separate persisted concept.
- **Settings** are saved repo-locally under `.codegraphy/settings.json` so graph preferences survive between sessions.
- **Graph Scope**, **Filter Setting**, **Favorite**, and **Legend Entry Toggle** are settings because they are saved between sessions.
- **Search** is temporary and should not be cached like a **Filter Setting**.
- **Collapse** is temporary for now and should not be cached like a **Setting**.
- The **Legend** themes graph nodes and edges.
- **Legend Layers** apply in this order: core defaults, plugin defaults, custom user entries.
- Custom user **Legend Entries** apply last and override core or plugin defaults.
- A **Legend Entry Toggle** controls whether a **Legend Entry** applies its styling.
- Turning off a **Legend Entry Toggle** does not hide matching nodes or edges; those graph items fall back to lower-priority styling.
- Custom **Legend Entries** can be deleted; core and plugin defaults are not deleted like user entries.
- Material Icon Theme styling currently belongs to the **Core Extension**, but it may become a plugin theming source later.
- Graph theming should remain compatible with VS Code themes.
- A **Graph Export** writes the current **Visible Graph**; an **Index Export** writes cached analysis data for software or agent consumption.
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
> **Dev:** "What happens when a user clicks Index Repo?"
> **Domain expert:** "**Indexing** runs **File Discovery**, **Tree-sitter Analysis**, **Plugin Analysis**, and **Graph Projection**, then saves the result in the **Graph Cache** for reuse and **Live Updates**."
>
> **Dev:** "Is Refresh the same as Re-index?"
> **Domain expert:** "No. **Refresh** reruns the force graph simulation. **Re-index** rebuilds graph data, saves it, then refreshes the graph."
>
> **Dev:** "Does CodeGraphy MCP build its own graph?"
> **Domain expert:** "No. **CodeGraphy MCP** reads the **Graph Cache** produced by the **Core Extension** and can ask the extension to re-index when the cache is missing or cannot answer."
>
> **Dev:** "Is the current collapsed graph a view?"
> **Domain expert:** "No. Use **Visible Graph** for graph state. A **View** is the VS Code UI container, such as the **Graph View** or **Timeline View**."
>
> **Dev:** "When I jump to a commit in the timeline, do I get a different UI?"
> **Domain expert:** "No. A **Timeline Snapshot** changes what nodes and edges render in the **Visible Graph** inside the **Graph View**."
>
> **Dev:** "Does someone need to fork CodeGraphy to add a new language relationship?"
> **Domain expert:** "No. They can build a **Plugin** or **Plugin Extension** that piggybacks on the base extension and contributes new graph understanding."
>
> **Dev:** "Are graph controls different from settings?"
> **Domain expert:** "Usually no. A UI control changes a **Setting**, and the **Setting** is the persisted repo-local value."
>
> **Dev:** "If I turn off the Godot `*.gd` Legend Entry, do GDScript files disappear?"
> **Domain expert:** "No. The **Legend Entry Toggle** only disables that styling, so matching nodes fall back to lower-priority styling."

## Flagged ambiguities

- "dependency graph" is too narrow for the main product concept; resolved: use **Relationship Graph** for the graph users interact with.
- "force graph" describes the interactive layout/presentation, not the domain object; resolved: use **Relationship Graph** for the graph and "force graph" only when discussing presentation mechanics.
- "relationship" is broader than dependency; resolved: use **Relationship** for the general concept and **Edge Type** for the category of a concrete rendered edge.
- "dependency" is not generic relationship direction; resolved: use **Dependency** only when the edge type specifically means one node needs another.
- "downstream" is directional only; resolved: it says a relationship exists in that direction, not what kind of relationship the edge represents.
- "connection" is acceptable in conversation as an informal synonym for **Relationship**, but docs and code should prefer **Relationship**.
- MCP reads the **Graph Cache** for agent access and does not own **Indexing**.
- Current MCP and extension code exposes freshness/staleness language; resolved: **Graph Cache** is expected to auto-update with graph changes, so freshness/staleness should not be treated as canonical domain language.
- "package" can be local or external; resolved: use **Workspace Package** when CodeGraphy can read and expand it, and **External Package** when the package is outside the local context and represented as one node.
- "collapse dependents" was ambiguous; resolved: **Collapse** absorbs downstream relationship nodes, not upstream nodes.
- Shared downstream relationship targets stay visible when they are still related to by visible nodes outside the collapsed subgraph.
- When a shared relationship target stays visible, the downstream path to it stays visible as a **Boundary Path**.
- Collapse behavior is not renderer-owned; resolved: CodeGraphy owns **Collapse Projection**, it runs after the **Visible Graph** exists, and the force graph renderer displays the resulting graph.
- Do not introduce "Collapsed Graph" as a separate pipeline term for now; resolved: the user still sees the **Visible Graph**, updated by **Collapse Projection**.
- "filter" and "collapse" both reduce **Visible Graph** detail but are not synonyms; resolved: **Filter** means ignore noise, while **Collapse** means summarize relevant hidden detail.
- Graph Scope before Filter is load-bearing: disabled **Node Types** and **Edge Types** must be removed before filter patterns are evaluated.
- **Show Orphans** is a final view setting because orphan status can only be known after **Graph Scope**, **Filter**, **Search**, and structural view settings have run.
