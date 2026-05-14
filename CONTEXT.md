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
A structural node representing a directory in the workspace, including an empty directory when folder nodes are active.
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

### Layout Organization

**Graph Section**:
A user-created graph organization area represented by a physics-participating **Section Node** that can expand to show members or collapse to a single node.
_Avoid_: Subgraph, group, container, compound node when speaking in product terms

**Section Frame**:
The expanded visual form of a **Section Node**, including its resizable rectangle, label, color, edge resize handles, and selection chrome.
_Avoid_: Container

**Section Member**:
A **Node** assigned to a **Graph Section** for user-controlled layout organization.
_Avoid_: Child node unless discussing prior-art parent-child graph models

**Section Node**:
The **Graph View** node that represents a **Graph Section** in the force layout while expanded or collapsed.
_Avoid_: Folder Node, indexed Node when discussing graph analysis

**Pinned Node**:
A **Node** with a persisted graph-space position that the graph layout treats as fixed until the pin is moved or removed.
_Avoid_: Favorite, locked node

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

**Tree-sitter Runtime**:
The parser engine CodeGraphy uses to run language grammars during Tree-sitter Analysis.
_Avoid_: Language coverage, analyzer

**Core Tree-sitter Language Coverage**:
A language grammar and CodeGraphy analyzer path bundled in the Core Package that produces baseline relationships during Tree-sitter Analysis.
_Avoid_: Tree-sitter support when only the parser runtime or grammar package is present

**Plugin Analysis**:
The indexing stage where plugins add or adjust **Nodes**, **Relationships**, and **Edge Types** after the built-in baseline analysis.
_Avoid_: Tree-sitter analysis

**Graph Projection**:
The indexing stage that turns discovered files and analysis results into graph nodes and edges.
_Avoid_: Rendering

**Graph Cache**:
The workspace-local LadybugDB graph data at `<workspace-root>/.codegraphy/graph.lbug` that stores indexed Relationship Graph data for CodeGraphy and agent access.
_Avoid_: Saved index, saved DB, CodeGraphy database when speaking in domain terms

**Live Update**:
An incremental graph update from repo changes after indexing has already produced a cache.
_Avoid_: Re-index, refresh

**Refresh**:
A user-triggered graph rerender that re-runs the force graph simulation without reprocessing graph data.
_Avoid_: Re-index, live update

**Refresh Graph**:
The UI action that refreshes graph layout by rerunning force graph physics without rebuilding graph data.
_Avoid_: Re-index Workspace

**Re-index**:
A user-triggered rebuild of graph data that reruns indexing and then refreshes the graph after data updates.
_Avoid_: Refresh when only rerunning graph physics

**Re-index Workspace**:
The UI action that rebuilds Relationship Graph data by running indexing, saving the result, and then refreshing the graph.
_Avoid_: Refresh Graph

### Agent Access

**CodeGraphy MCP**:
The local MCP server and CLI that let agents inspect a CodeGraphy Workspace, ask `@codegraphy/core` to run Indexing, and request focused Graph Query results without opening or focusing VS Code.
_Avoid_: Agent bridge, MCP indexer, MCP graph

**Graph Query**:
An agent or Graph View request against Relationship Graph data that can apply Graph Scope, Filter, Search, sorting, pagination, traversal, and result limits before returning graph data.
_Avoid_: View graph, saved graph view, Visible Graph when the result is not the UI-rendered graph

### Views And Timeline

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

**2D Zoom**:
Graph View Zoom in two-dimensional mode, where zoom changes the rendered graph scale.
_Avoid_: Camera distance

**3D Zoom**:
Graph View Zoom in three-dimensional mode, where zoom changes camera distance while preserving the current camera direction and target.
_Avoid_: Graph scale

**Continuous Zoom**:
Graph View Zoom that repeats while the user holds a zoom control.
_Avoid_: Fit View, Refresh

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

**VS Code Extension**:
The CodeGraphy VS Code extension that owns visualization, VS Code lifecycle integration, editor commands, webviews, and VS Code-specific UI.
_Avoid_: Core engine, plugin host only

**Core Package**:
The `@codegraphy/core` npm package that owns headless Indexing, Graph Cache access, plugin wiring, and Graph Query.
_Avoid_: VS Code extension when referring to headless engine behavior

**Plugin**:
A headless CodeGraphy npm package that communicates with `@codegraphy/core` to add or improve analysis, graph types, filters, symbols, and relationship evidence.
_Avoid_: VS Code extension when referring to the CodeGraphy capability

**Plugin Package**:
An npm package that declares `package.json#codegraphy` metadata and exports a CodeGraphy plugin runtime through normal package exports.
_Avoid_: VS Code extension package

**Built-in Plugin**:
A plugin developed with CodeGraphy and shipped from the monorepo as part of the current product experience or examples.
_Avoid_: Required plugin

**Markdown Plugin**:
The headless plugin installed with `@codegraphy/core`, enabled by default for new CodeGraphy Workspaces, and still toggleable like other plugins.
_Avoid_: External markdown extension

### Settings And Styling

**Setting**:
A workspace-local persisted preference in `.codegraphy/settings.json` that changes graph behavior, appearance, filtering, plugin enablement, or feature state.
_Avoid_: Control when referring to the persisted value

**Settings Control**:
A UI control that changes a Setting.
_Avoid_: Setting when referring only to the UI element

**Display Setting**:
A Setting that changes how graph information is presented without changing which graph items exist in the **Relationship Graph**. Display Settings include visual preferences and lower-frequency view behavior such as labels, orphans, renderer mode, direction indicators, bidirectional edge display, and depth controls.
_Avoid_: Graph Scope, Search, Filter Setting

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

- A **Relationship Graph** is presented through an interactive force graph.
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
- A **Graph Context Menu** is opened from the current **Context Selection** and should present actions that match that selection's target type.
- Graph Context Menu action availability can be decided by an explicit menu decision model; that model owns which actions appear, not right-click selection mechanics.
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
- A **Graph Section** organizes **Section Members** on the **Graph Stage** and is represented by a **Section Node** in the force layout.
- A **Section Frame** is the editable expanded visual form of a **Section Node**.
- A **Section Node** can be expanded into its **Section Frame** or collapsed into a single node; it must not be confused with a **Folder Node**, which represents a real workspace directory.
- An expanded **Graph Section** shows its **Section Members**, and those members use section-local physics centered on that section's origin instead of participating directly in the root graph physics simulation.
- **Section Members** interact physically with other visible members in the same **Graph Section** and use hard visual bounds inside the **Section Frame**.
- **Section Members** remain renderable graph nodes on the single React Force Graph surface so they keep normal hit testing, labels, edges, and built-in node dragging.
- The root graph physics simulation can contain different node geometries, including circular ordinary nodes and rectangular expanded **Section Nodes**, and those visible root actors should collide according to their visible geometry.
- Moving an expanded **Section Frame** moves its visible **Section Members** by the same graph-space delta before physics resumes.
- Moving an expanded **Section Frame** also moves visible pinned **Section Members** and updates their persisted pin positions by the same graph-space delta.
- Moving a collapsed **Section Node** moves its hidden **Section Members** and any persisted member pin positions by the same graph-space delta for the next expansion.
- A pinned **Section Member** moves relative to its owning **Section Frame** when the section moves.
- Dragging a pinned **Section Member** outside its owning **Section Frame** updates the pin to the dropped graph-space position and removes that node from the **Graph Section**.
- A **Section Frame** has a content minimum size based on its members, chrome, and padding; resizing below that minimum collapses the **Graph Section**.
- A parent **Section Frame** includes child **Section Frames** in its content minimum size.
- Expanding a collapsed **Graph Section** restores a **Section Frame** at least as large as its current content minimum size.
- Collapsing a parent **Graph Section** hides its descendant sections without changing their own expanded or collapsed state.
- Expanding a parent **Graph Section** restores each descendant section to the expanded or collapsed state it had before the parent was collapsed.
- Collapsing a **Graph Section** stops its section-local simulation and preserves latest direct-child local positions.
- Expanding a **Graph Section** restores saved direct-child local positions and gently restarts its section-local simulation.
- A **Node** becomes a **Section Member** only through explicit user intent, such as dropping it into a **Section Frame** or using a Graph Context Menu action.
- A **Node** stops being a **Section Member** only through explicit user intent, such as dropping it outside its **Section Frame** or using a Graph Context Menu action.
- Dragging across **Section Frame** boundaries previews the candidate target, but membership changes only when the user drops the dragged item.
- Dragging any **Section Member** outside its owning **Section Frame** and dropping it removes the item from that **Graph Section**.
- Any visible **Node Type** can become a **Section Member**, including File Nodes, Folder Nodes, Package nodes, and Plugin Nodes.
- **Section Member** assignment survives temporary node visibility changes from **Graph Scope**, **Search**, **Filter**, **Show Orphans**, or similar view settings.
- If a hidden **Section Member** becomes visible again and its owning **Graph Section** still exists, it returns to that **Graph Section**.
- If a hidden **Section Member** becomes visible again after its owning **Graph Section** was deleted, it returns to the root graph.
- **Pinned Node** and **Section Member** records can remain dormant while their graph item is hidden or temporarily absent, and should apply again if that graph item returns.
- Explicitly deleting a graph item through CodeGraphy should remove that item's pin and section ownership records.
- **Depth Mode** does not mutate **Section Member** assignment and should preserve section context for visible **Section Members**.
- When **Depth Mode** shows a **Section Member**, its owning **Graph Section** should remain visible enough to show containment context even when the section itself is outside the hop depth.
- **Timeline Snapshots** do not show or allow editing **Pinned Nodes** or **Graph Sections** in v1.
- Physics drift across a **Section Frame** boundary must not add or remove **Section Member** assignment.
- Nested **Graph Sections** form an ownership hierarchy: a node in Section 2 inside Section 1 is directly a **Section Member** of Section 2, while Section 2 is the member within Section 1.
- Nested **Graph Section** support is recursive: a **Graph Section** can contain another **Graph Section**, which can contain its own **Section Members** or nested sections.
- Nested **Graph Section** coordinates are local to the direct parent, recursively, rather than flattened into root graph coordinates.
- A **Graph Section** or **Node** must have at most one direct section owner, and nested section ownership must not form cycles.
- **Section Member** ownership is persisted in a normalized ownership index, while **Graph Sections** store their own visual and layout state separately.
- Deleting only a **Graph Section** removes that section and promotes its direct child nodes and child sections to the deleted section's parent owner.
- Promoted children keep their current graph-space positions when their owning **Graph Section** is deleted.
- Deleting an explicit multi-selection that includes a **Graph Section** and its contents can delete the whole selected set.
- Any delete action requires confirmation.
- An **Edge** to a visible **Section Member** renders to that member while its **Graph Section** is expanded.
- A cross-boundary **Edge** to a visible **Section Member** renders to and physically influences the real member endpoint, while that member remains scoped to its section-local physics and **Section Frame** bounds.
- Cross-boundary **Edge** physics is symmetric while a **Graph Section** is expanded: the outside endpoint and the **Section Member** endpoint both feel the relationship through coordinate conversion between root graph space and section-local graph space.
- Cross-boundary **Edge** physics must not pull the **Section Node** as a proxy for a visible **Section Member**.
- **Section Frame** bounds win over cross-boundary **Edge** pull.
- When a **Graph Section** is collapsed, cross-boundary **Edges** render to each endpoint's nearest visible representative as a projection of the original relationships.
- Projected cross-boundary **Edges** with the same visible source, visible target, and **Edge Type** render as one aggregated edge that preserves the original edge list for inspection.
- Projected cross-boundary **Edges** with different **Edge Types** remain visually distinct.
- A **Graph Section** membership relationship is layout state, not a rendered **Edge**; CodeGraphy should not render **Section Node** to **Section Member** edges.
- A **Graph Section** does not create, remove, or change **Relationships** in the **Relationship Graph**.
- A **Pinned Node** keeps a user-chosen graph-space position while preserving the node's normal **Relationships**.
- **Pinned Node** positions are stored in graph-space coordinates relative to the graph origin, not viewport pan or zoom.
- A **Pinned Node** is not moved by physics while the pin is active.
- A pinned **Section Member** or nested **Section Node** stores a direct-parent-local position and is not moved by its section-local physics while the pin is active.
- 2D and 3D **Pinned Node** positions are separate; a 2D pin applies only in 2D and a 3D pin applies only in 3D.
- **Pinned Nodes** show a small pin badge; collapsed **Section Nodes** show a collapsed-section badge and hidden-descendant count.
- A **Graph Section** has a required label and optional free-form color; the label appears on both the expanded **Section Frame** and collapsed **Section Node**.
- **Graph Section** identity comes from a generated stable id, not its editable label.
- **Graph Section** color tints the **Section Frame** border and header without flood-filling the whole section; users can choose any color from the color picker.
- A selected expanded **Section Frame** shows an accent border, subtly tinted header, and visible resize handles.
- Active marquee selection shows a visible desktop-style selection rectangle while the user click-drags.
- A selected **Section Frame** can be a graph placement target for creating a nested **Graph Section** or placing a newly created File Node or Folder Node.
- A selected **Folder Node** can be a filesystem destination for creating a new file or folder.
- When both a **Folder Node** and **Section Frame** are selected for file or folder creation, the **Folder Node** supplies the filesystem destination and the **Section Frame** supplies the graph placement owner.
- Creating a **Graph Section** from selection changes only graph ownership and layout; it must not create, remove, or change **Edges**.
- Renaming or moving a file or folder should preserve its **Section Member** assignment when CodeGraphy can identify the moved graph item as the same logical item.
- A **Section Node** can be a **Pinned Node**; pinning a **Section Node** fixes the section's graph-space position without automatically pinning its **Section Members**.
- **Graph Section** editing is 2D-only in v1; 3D does not render **Graph Sections** or **Section Nodes** in v1.
- The force graph renderer handles layout, physics, and interaction for the graph produced by **Collapse Projection**.
- **Filter** applies persistent include/exclude criteria to graph consideration; **Collapse** keeps important graph items available behind a collapsed node.
- **Indexing** starts with **File Discovery**, then runs **Tree-sitter Analysis**, then **Plugin Analysis**, then **Graph Projection**.
- The **Tree-sitter Runtime** alone does not create **Relationships**; CodeGraphy needs **Core Tree-sitter Language Coverage** or **Plugin Analysis** to produce useful graph data for a language.
- A language has **Core Tree-sitter Language Coverage** when the **Core Package** bundles its grammar, maps its file extensions, and extracts baseline relationships that project into the **Relationship Graph**.
- **Core Tree-sitter Language Coverage** should be depth-first: a smaller set of languages with meaningful baseline relationships is better than a broad set of parser-only languages.
- **Core Tree-sitter Language Coverage** should reuse shared Tree-sitter analysis code where languages follow the same parser-backed patterns, keeping language-specific code small.
- When a language or ecosystem needs complex project-aware semantics, shallow **Core Tree-sitter Language Coverage** can provide baseline relationships while deeper support belongs in **Plugin Analysis**.
- Structured data and styling formats such as JSON and CSS are outside **Core Tree-sitter Language Coverage** unless a separate relationship model is defined for them.
- C and C++ **Core Tree-sitter Language Coverage** should include local include relationships, useful code symbols, examples, and docs; full compiler include-path semantics, macros, templates, and conditional compilation are deeper project-aware work.
- **Graph Projection** produces the **Relationship Graph** data that later flows through **Graph Scope**, **Filter**, **Search**, and view settings.
- **Graph Cache** stores indexed graph data so reopening the repo does not require full **Indexing**.
- **Live Updates** keep the **Graph Cache** and graph data current as files change.
- Any graph-changing update from added files, renamed files, changed code, or settings that affect graph data should be saved to **Graph Cache**.
- **CodeGraphy MCP** is a lightweight command and query adapter; the **Core Package** owns **Graph Cache** access, **Indexing**, plugin wiring, and Graph Query execution.
- **CodeGraphy MCP** runs against the current or explicit **CodeGraphy Workspace** path and should not require a prior repo selection or VS Code focus for normal Indexing and Graph Query.
- **CodeGraphy MCP** should not be limited to the **Visible Graph**; it should ask the **Core Package** for **Relationship Graph** data and allow agent queries to apply **Graph Scope**, **Filter**, and **Search** to reduce noise.
- A **Graph Query** is not a VS Code **View**; it is a narrowed agent-facing result from **Relationship Graph** data.
- **Graph Queries** should reuse **Graph Scope**, **Filter**, **Search**, sorting, and pagination semantics instead of introducing MCP-specific equivalents for the same graph narrowing stages.
- **Refresh Graph** and **Re-index Workspace** should be distinct UI actions.
- **Refresh** only reruns the force graph simulation and does not process source data.
- **Re-index** reruns **Indexing**, updates graph data, persists it to **Graph Cache**, and then **Refreshes** the graph.
- CodeGraphy has two **Views**: the **Graph View** and the **Timeline View**.
- The **Graph View** contains the **Visible Graph**, search, filters, popups, settings UI, and overlay controls.
- The **Visible Graph** is graph data shown inside the **Graph View**, not the whole view.
- **VS Code Theme Integration** is the top UI rule: extension chrome should inherit the active VS Code theme through CodeGraphy/shadcn semantic tokens before applying CodeGraphy-specific styling.
- UI cleanup should establish the VS Code token bridge and local CodeGraphy UI-kit primitives before reshaping individual surfaces such as the **Graph Tool Rail**, **Search**, **Filter**, **Settings**, and **Graph Panels**.
- The existing `components/ui` layer should follow shadcn's copy-and-own model: generated Radix/shadcn source lives in the repo, CodeGraphy owns and customizes it, and feature code may import from `components/ui` as the local CodeGraphy UI kit. Do not create a separate wrapper layer just to keep shadcn files pristine.
- CodeGraphy should keep the existing root `components.json` and `@/...` alias for shadcn configuration because the **VS Code Extension** is currently the only UI owner. Do not introduce package imports or a shared UI package until another workspace consumes CodeGraphy UI components.
- The first `components/ui` cleanup should prioritize token and theming correctness in existing primitives. Higher-level primitives such as graph rail buttons, panel sections, field rows, and search/filter chrome should be added only as each surface migrates and proves the need.
- Implementation order after token and primitive cleanup is agent-owned and may change as dependencies become clear. The product requirement is that all VS Code Extension UI surfaces converge on the same VS Code token bridge and local CodeGraphy UI kit, including **Graph Stage** chrome, graph rendering colors, **Search**/**Filter**, **Graph Tool Rail**, **Settings**, **Timeline View**, **Graph Panels**, and **Legend**.
- UI cleanup is done only when light, dark, high-contrast, and red/accent-heavy themes have been verified; UI chrome colors come from the active VS Code theme through the token bridge rather than hardcoded values; common controls use shared `components/ui` primitives; graph rendering consumes resolved CSS-token colors; and before/after screenshots cover **Graph View**, **Timeline View**, and key open-panel states.
- UI cleanup verification should combine lightweight automated checks for token plumbing and hardcoded-color regressions with screenshot review for visual judgment in light, dark, high-contrast, and red/accent-heavy themes. Screenshot anchors are Solarized Light for light, GitHub Dark for dark, High Contrast for high contrast, and Red for the red/accent-heavy theme. The screenshot pass should include default **Graph View** and **Timeline View** states plus the **Legend** with default content as the representative panel screenshot so panel chrome is checked without seeded user data or multiplying every panel across every theme.
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
- A valid **Filter Rule** that currently matches no graph items is allowed because it may be preparing for future files, another branch, or a different **Timeline Snapshot**. No-match is not the same as invalid pattern syntax.
- A **Filter Rule** should be rejected only when it is empty or the chosen matcher cannot parse it. Weird but parseable patterns are allowed, even if they match nothing.
- The expanded **Filter** surface should show subtle per-rule match metadata such as "0 matches" or "12 matches". Match metadata is neutral information, not a warning when the count is zero.
- **Filter Rule** matching should use one shared VS Code-like matcher across discovery, **Graph View** filtering, **Timeline Snapshots**, and **Graph Query**, so Include and Exclude behavior stays predictable everywhere.
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
- Renderer mode such as 2D/3D should be treated as a **Display Setting** unless real usage proves it needs to be a primary **Graph Tool Rail** action.
- `maxFiles` is a Performance setting, not a **Display Setting**.
- **Graph View Zoom** is a view interaction only; it does not change **Relationship Graph** data, **Graph Scope**, **Filter**, or **Search**.
- **2D Zoom** changes rendered graph scale, while **3D Zoom** changes camera distance.
- **Continuous Zoom** should use the same zoom step as repeated single zoom actions.
- **3D Zoom** should clamp camera distance relative to the current graph context so holding zoom out does not make the graph effectively disappear.
- **Graph Query** behavior should live in a Core Package **Module** so the **Graph View** Adapter and **CodeGraphy MCP** Adapter use the same **Graph Scope**, **Filter**, **Search**, sorting, pagination, structural nodes, and relationship evidence semantics.
- The **Graph Query** **Module** should return the graph data callers ask for while exposing opt-in query stages such as **Graph Scope** Node Type and Edge Type enablement, **Filter** conditions, **Search**, sorting, pagination, and **Show Orphans** where applicable.
- **Graph Scope** query behavior is about whether Node Types such as files, folders, and packages, and Edge Types such as imports, calls, tests, and nests are enabled; visual styling such as node colors belongs to the **Graph View** Adapter.
- Core **Edge Types** should use canonical core ids such as `nests`; namespaced ids are appropriate for plugin-owned **Edge Types**.
- A **Graph Query** configuration should keep stage inputs together: `scope.nodes`, `scope.edges`, `filters`, `search`, `sort`, `limit`, `offset`, and `showOrphans` where applicable.
- **Show Orphans** remains a boolean view setting in **Graph Query** configuration.
- Structural **Folder Node** and **Workspace Package** projection belongs inside the **Graph Query** **Module**, so the **Graph View** Adapter and **CodeGraphy MCP** Adapter use the same structural graph behavior.
- When callers opt in to multiple query stages, the **Graph Query** **Module** must apply them in canonical order so stages compound correctly: **Graph Scope** before **Filter**, **Filter** before **Search**, **Show Orphans** last where applicable, then sorting and pagination.
- The **Timeline View** lets users jump through commits in git history.
- Selecting a **Timeline Snapshot** changes the nodes and edges rendered in the **Visible Graph** inside the **Graph View**.
- **Timeline Snapshots** still flow through the same **Graph Scope**, **Filter**, **Search**, and view setting stages as the current workspace **Relationship Graph**.
- A **Timeline Snapshot** uses a commit as its **Graph Revision** and should show the files and relationships from that commit only.
- The default **Graph Revision** is the current `HEAD` plus working tree state, updated by **Live Updates**.
- Graph Context Menu mutation actions should stay available for the default **Graph Revision** and should be disabled for historical **Timeline Snapshots**.
- The **Core Package** and **VS Code Extension** together provide the out-of-box Relationship Graph product and should work for most users without optional plugins.
- The **Core Package** uses Tree-sitter coverage and the bundled **Markdown Plugin** to provide useful default analysis; the **VS Code Extension** adds visualization and Material icon styling.
- A **Plugin** can add **Nodes**, **Node Types**, **Relationships**, **Edge Types**, Symbol Nodes, preset filters, and relationship evidence.
- A **Plugin** can analyze files by reading lines, using AST tooling, or any other analysis approach appropriate to its language or framework.
- A **Plugin Package** is the packaging route for third-party plugins.
- **Built-in Plugins** in this monorepo are examples and fast-development plugins, not required dependencies unless explicitly installed or bundled by the Core Package.
- The **Markdown Plugin** is installed with `@codegraphy/core` and enabled by default for new CodeGraphy Workspaces, but users can still toggle it off.
- A **Settings Control** changes a **Setting**; it is not a separate persisted concept.
- **Settings** are saved workspace-locally under `.codegraphy/settings.json` so graph preferences survive between sessions.
- **Graph Scope**, **Filter Setting**, **Display Setting**, **Favorite**, and **Legend Entry Toggle** are settings because they are saved between sessions.
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
> **Domain expert:** "No. **Refresh** reruns the force graph simulation. **Re-index** rebuilds graph data, saves it, then refreshes the graph."
>
> **Dev:** "Does CodeGraphy MCP build its own graph?"
> **Domain expert:** "No. **CodeGraphy MCP** asks the **Core Package** to run **Indexing** when needed and returns **Graph Query** results produced by the **Core Package**."
>
> **Dev:** "Is the current collapsed graph a view?"
> **Domain expert:** "No. Use **Visible Graph** for graph state. A **View** is the VS Code UI container, such as the **Graph View** or **Timeline View**."
>
> **Dev:** "When I jump to a commit in the timeline, do I get a different UI?"
> **Domain expert:** "No. A **Timeline Snapshot** changes what nodes and edges render in the **Visible Graph** inside the **Graph View**."
>
> **Dev:** "Does someone need to fork CodeGraphy to add a new language relationship?"
> **Domain expert:** "No. They can build a **Plugin Package** that integrates with `@codegraphy/core` and contributes new graph understanding."
>
> **Dev:** "Are graph controls different from settings?"
> **Domain expert:** "Usually no. A UI control changes a **Setting**, and the **Setting** is the persisted workspace-local value."
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
- **CodeGraphy MCP** delegates **Graph Cache** reads/writes and **Graph Query** execution to the **Core Package**.
- Current MCP and extension code exposes freshness/staleness language; resolved: stale status is a status/reporting concern, not a replacement term for **Graph Cache** or **Relationship Graph**.
- "package" can be local or external; resolved: use **Workspace Package** when CodeGraphy can read and expand it, and **External Package** when the package is outside the local context and represented as one node.
- "collapse dependents" was ambiguous; resolved: **Collapse** absorbs downstream relationship nodes, not upstream nodes.
- Shared downstream relationship targets stay visible when they are still related to by visible nodes outside the collapsed subgraph.
- When a shared relationship target stays visible, the downstream path to it stays visible as a **Boundary Path**.
- Collapse behavior is not renderer-owned; resolved: CodeGraphy owns **Collapse Projection**, it runs after the **Visible Graph** exists, and the force graph renderer displays the resulting graph.
- Do not introduce "Collapsed Graph" as a separate pipeline term for now; resolved: the user still sees the **Visible Graph**, updated by **Collapse Projection**.
- "filter" and "collapse" both reduce **Visible Graph** detail but are not synonyms; resolved: **Filter** means persistent include/exclude criteria, while **Collapse** means summarize relevant hidden detail.
- Graph Scope before Filter is load-bearing: disabled **Node Types** and **Edge Types** must be removed before filter criteria are evaluated.
- **Show Orphans** is a final view setting because orphan status can only be known after **Graph Scope**, **Filter**, **Search**, and structural view settings have run.
