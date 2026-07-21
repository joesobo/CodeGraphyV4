# Graph Interactions

## Nodes and Graph Stage

| Input | Result |
|---|---|
| Click a Node | Select and focus it. A File Node also opens in VS Code preview. |
| Double-click a File Node | Open it as a persistent editor tab. |
| `Cmd+Click` on macOS or `Ctrl+Click` on Windows/Linux | Add or remove a Node from the selection. |
| Drag a Node | Reposition it for the current graph session. |
| Hover a Node | Show path, size, modified time, Relationships, and contributing plugin details. |
| Left-drag the Graph Stage | Box-select Nodes. |
| `Shift` + left-drag | Add boxed Nodes to the current selection. |
| Right-drag | Pan without opening the context menu. |
| Scroll | Zoom around the pointer. |
| Right-click and release | Open the context menu for the background, Node, selected group, or Edge. |
| `Ctrl+Click` on macOS | Open the context menu when a right-click is unavailable. |

Fit to Screen animates graph center and zoom. Pointer input interrupts a running camera animation so panning and wheel zoom stay responsive.

Git-ignored File and Folder Nodes remain visible with muted styling. CodeGraphy uses Git's ignored state rather than dimming every path that happens to match text in `.gitignore`.

## Minimap

Enable **Show Minimap** under Settings > Display to show a 160 by 160 minimap at the lower left. It renders the current Visible Graph and marks the viewport.

| Input | Result |
|---|---|
| Click or drag in the minimap | Center and pan the main graph. |
| Drag the viewport marker | Move the current viewport without changing its grab offset. |
| Arrow keys while the minimap has focus | Pan by ten percent of the viewport. |
| `Shift` + arrow key | Pan five times farther. |
| `Escape` during a pointer drag | Cancel the active minimap drag. |

The minimap consumes wheel and context-menu input so those events do not leak into the main Graph Stage.

## Context Menu

The menu opens on pointer release, which lets a held right button become a pan gesture. Available actions depend on the captured Context Selection.

| Action | Result | Undoable |
|---|---|---|
| Open File | Open a File Node in the editor. | No |
| Reveal in Explorer | Reveal a file or folder in VS Code Explorer. | No |
| Copy Path | Copy a workspace-relative path. | No |
| Rename | Rename the selected file. | Yes |
| Delete | Move selected files to trash after confirmation. | Yes |
| Create File / Create Folder | Create inside a Folder Node or the workspace root. | Yes |
| Toggle Favorite | Add or remove persistent favorite emphasis. | Yes |
| Add to Filter | Add a persistent exclusion pattern. | Yes |
| Copy Edge Paths | Copy the source, target, or both paths from an Edge. | No |

Use `Cmd+Z` or `Ctrl+Z` to undo and `Cmd+Shift+Z` or `Ctrl+Shift+Z` to redo. A multi-node selection only shows actions that support the complete selection.

## Graph Tool Rail

The left rail groups lifecycle, graph tools, plugin actions, and system panels.

| Control | Result |
|---|---|
| Index / Refresh | Shows **Index Workspace** when the Graph Cache is missing, **Reindex Workspace** when stale, and **Refresh** when a cache exists. |
| Node Size | Chooses Connections or File Size. |
| New | Creates a file, folder, or plugin-provided background item. |
| Plugin actions | Runs active plugin toolbar contributions. |
| Graph Scope | Opens one panel with Node Types and Edge Types tabs. |
| Themes | Opens Legend, CSS Snippet, and plugin-provided theme controls. |
| Plugins | Opens workspace plugin enablement and ordering. |
| Settings | Opens Display, Forces, Performance, and Export sections. |

Only one right-side panel is open at a time. Compact popovers such as Node Size stay attached to their rail button.

## Settings and Graph Scope

Settings contains four collapsed sections:

- **Display**: direction, bidirectional Edges, Depth Mode and limit, Show Orphans, particle direction controls, labels, and minimap.
- **Forces**: repel, center, link distance, link force, and damping controls for WebAssembly physics.
- **Performance**: Max Files, Verbose Diagnostics, and Show FPS.
- **Export**: image, graph data, symbol data, and plugin export actions.

Graph Scope owns visibility by Node Type and Edge Type. Themes owns graph styling. Disabling a Legend Entry changes styling only; it does not remove matching graph items.

See [Settings](./SETTINGS.md) for persisted keys and defaults.

## Export

Settings > Export provides:

- PNG, SVG, and JPEG image exports
- JSON and Markdown exports of the current Visible Graph
- Symbols JSON from indexed analysis
- export actions contributed by enabled plugins
