# Changelog

All notable changes to CodeGraphy will be documented in this file.

This project uses [Changesets](https://github.com/changesets/changesets) for versioning.

## 4.1.2

### Patch Changes

- Load installed CodeGraphy plugins before the first graph analysis so external plugins, rules, and timeline connections are available as soon as the sidebar opens.

## 4.1.1

### Patch Changes

- Fix the published core extension package so the Graph and Timeline sidebar views ship the latest bundled UI instead of stale build output.

## 4.1.0

### Minor Changes

- Split the CodeGraphy sidebar into separate Graph and Timeline views, move the graph controls into a vertical toolbar so they stay usable in narrow sidebars, keep both views stable when the sidebar is collapsed or expanded, and turn the Timeline view into a richer playback panel with current commit details, transport controls, and a compact commit list.

### Patch Changes

- Fix custom group editing in the sidebar so new groups, toggles, and edits update immediately instead of lagging behind VS Code settings.

## 4.0.2

### Patch Changes

- Keep CodeGraphy settings, favorites, and custom groups in sync between VS Code settings and the sidebar UI.
- Fix custom group glob patterns so nested folders like `DIR_NAME/*` and `DIR_NAME/**` are matched correctly.
- Reduce random and duplicate graph refreshes caused by overlapping watcher, ready, group, decoration, and settings update events.
- Fix extra graph refreshes while editing custom groups in the settings panel.

## 4.0.1

### Patch Changes

- Fix companion extension activation so installed language plugins register with the core graph and their connections appear reliably.
- Refresh the published README links, package icons, and marketplace metadata for the core extension and companion packages.

## 4.0.0

Initial development release. Core features:

- Interactive 2D/3D force-directed graph visualization of codebases
- Multi-language support via plugin system (TypeScript/JS, Python, C#, GDScript, Markdown)
- Plugin API v2 with rules, decorations, context menus, and event bus
- Three graph views: Connections, Depth Graph, Folder
- DAG layout modes: Default, Radial Out, Top Down, Left to Right
- Node size modes: Connections, File Size, Access Count, Uniform
- Settings panel with physics tuning, color groups, filters, and display options
- Toolbar with view/layout/dimension/node-size toggles and action buttons
- Context menu with file operations (open, rename, delete, create, favorite, exclude)
- Undo/redo support for destructive actions
- Timeline playback for git history visualization
- Export to PNG, SVG, JPEG, JSON, Markdown
- Keyboard shortcuts for navigation and view cycling
