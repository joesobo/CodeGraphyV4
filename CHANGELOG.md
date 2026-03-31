# Changelog

All notable changes to CodeGraphy will be documented in this file.

This project uses [Changesets](https://github.com/changesets/changesets) for versioning.

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
