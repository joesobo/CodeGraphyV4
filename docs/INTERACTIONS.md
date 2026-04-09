# Graph Interactions

![Search filtering](./media/search.gif)

## Nodes

| Action | Effect |
|--------|--------|
| Click | Select and outline the node, then open the file in temporary preview |
| Double-click | Select and outline the node, open the file permanently, and focus the node in the graph |
| Right-click | Open the context menu |
| `Ctrl+Click` (macOS) | Open the context menu (same as right-click) |
| Drag | Reposition the node (position is saved) |
| Hover | Show tooltip with file details |
| Hover cursor | Pointer cursor |
| `Ctrl+Click` / `Cmd+Click` | Add or remove from selection |

## Canvas

| Action | Effect |
|--------|--------|
| Drag | Pan the view |
| Scroll | Zoom in/out |
| Hover cursor | Default cursor |
| Right-click | Open background context menu |
| `Shift+Drag` | Box select multiple nodes |

## Context menu

Right-click background, nodes, multi-node selections, or edges to access context-specific actions:

| Action | Description | Undoable |
|--------|-------------|----------|
| Open File | Open in editor | - |
| Reveal in Explorer | Show in VS Code file explorer | - |
| Copy Path | Copy relative path to clipboard | - |
| Delete | Move file(s) to trash | Yes |
| Rename | Rename file via inline prompt | Yes |
| Create File | Create a new file in the same directory | Yes |
| Toggle Favorite | Mark or unmark with yellow outline | Yes |
| Add to Filter | Hide from graph via filter pattern | Yes |
| Copy Source/Target/Both Paths (edge) | Copy connected file paths from an edge | - |

Undoable actions support `Ctrl+Z` / `Cmd+Z` to undo and `Ctrl+Shift+Z` / `Cmd+Shift+Z` to redo.

![Context menu](./media/context-menu.png)

Implementation details and the full action/context matrix live in [Context Menu](./CONTEXT_MENU.md).

## Tooltips

Hover any node to see:

- File path relative to workspace
- File size
- Last modified (relative timestamp like "2h ago")
- Incoming connections (files that import this)
- Outgoing connections (files this imports)
- Visit count
- Handling plugin

## Toolbar

The toolbar sits at the bottom of the graph and is split into two sides.

**Left side — toggle controls:**

| Control | Description |
|---------|-------------|
| Depth mode toggle | Turns the focused depth behavior on or off. |
| Depth slider | Adjusts depth limit (1-5). Only visible when depth mode is active. |
| DAG mode buttons | Switch layout: Default (free-form), Radial Out, Top Down, Left to Right. |
| 2D/3D toggle | Switch between 2D canvas and 3D WebGL rendering. |
| Node size buttons | Switch node sizing: Connections, File Size, Access Count, or Uniform. |

**Right side — actions:**

| Control | Description |
|---------|-------------|
| Nodes | Opens node visibility controls for core and plugin-added node kinds. |
| Edges | Opens edge visibility controls and shows current edge colors. |
| Index Repo / Refresh | Before indexing: builds the repo index. After indexing: forces a full re-index. |
| Export | Dropdown for exporting as PNG, SVG, JPEG, graph JSON, graph Markdown, or symbol JSON. |
| Legends | Opens legend rule editing and color priority controls. |
| Plugins | Opens the plugins panel. |
| Settings | Opens the settings panel. |

Toolbar and panel state are driven by repo-local settings in `.codegraphy/settings.json`.

## Panels

Panels open from the right side of the graph. Only one panel is open at a time.

### Settings (gear icon)

Physics and general graph behavior. See [Settings](./SETTINGS.md) for details.

### Nodes (shape icon)

Toggle node kinds such as files, folders, packages, and plugin-added node types. Each row also shows the current color for that node kind.

### Edges (line icon)

Toggle edge kinds such as `NESTS`, imports, calls, references, and plugin-added edge types. Each row also shows the current color for that edge kind.

### Legends (paint icon)

Manage regex-based legend rules. Drag to reorder priority. Bottom rules apply first, top rules apply last and can override lower matches.

### Plugins (puzzle icon)

Toggle whole plugins on or off and drag them to change processing priority. Plugins are processed bottom-to-top, so entries nearer the top win merge conflicts. Built-in plugins show up here too. See [Plugins](./PLUGINS.md) for plugin development.

![Plugins panel](./media/plugins-panel.png)

### Index / Refresh (autorenew icon)

Before the repo has an index, this button is **Index Repo**. After the repo is indexed, it becomes **Refresh** and forces a full re-index.

## Timeline

The timeline bar appears below the graph after indexing. See [Timeline](./TIMELINE.md) for full details.

| Action | Effect |
|--------|--------|
| Click track | Jump to that point in time |
| Drag track | Scrub through time |
| Play/Pause | Toggle automatic playback |
| Current | Jump to latest commit |
| Click node | Select and outline the node, then open a temporary preview at the selected commit |
| Double-click node | Select and outline the node, open the file at the selected commit permanently, and focus the node |

During timeline mode, destructive context menu actions (Delete, Rename, Create File, Add to Filter) are hidden.

## Export

Export the current graph via the Command Palette:

- **PNG** for a rasterized snapshot at the current zoom and pan
- **SVG** for a scalable vector preserving graph structure
- **JSON** for graph data with explicit `legend`, `nodes`, and `edges`
- **Markdown** for a readable graph snapshot with legend, nodes, and edges
- **Symbols JSON** for indexed symbol and relation data built from the cached analysis store
