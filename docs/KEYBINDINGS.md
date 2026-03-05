# Keyboard Shortcuts

## Graph Navigation (in-graph shortcuts)

These shortcuts work when the graph view is focused and no text input is active.

| Shortcut | Action |
|----------|--------|
| `0` | Fit all nodes in view |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `Ctrl+A` / `Cmd+A` | Select all nodes |
| `Escape` | Deselect all nodes |
| `Enter` | Open selected node(s) in editor |
| `Ctrl+Click` | Add/remove node from selection |
| `Shift+Drag` | Box selection |
| `Right-click` | Open context menu |

## VS Code Commands

These are registered as VS Code commands and appear in the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`). They can be rebound in **File > Preferences > Keyboard Shortcuts** — search "CodeGraphy".

| Default Shortcut | Command | When |
|-----------------|---------|------|
| `0` | Fit All Nodes in View | Graph focused |
| `=` or `Shift+=` | Zoom In | Graph focused |
| `-` | Zoom Out | Graph focused |
| `Ctrl+Z` / `Cmd+Z` | Undo | CodeGraphy panel visible, no text input |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo | CodeGraphy panel visible, no text input |
| `Ctrl+Y` | Redo (alternate) | CodeGraphy panel visible, no text input |

The Undo/Redo shortcuts only fire when the CodeGraphy activity bar panel is active and no editor or input field has focus — so they won't conflict with normal editor undo/redo.

## Customizing Shortcuts

Open **File > Preferences > Keyboard Shortcuts** (or `Ctrl+K Ctrl+S`) and search for "CodeGraphy" to see and rebind any command.

You can also edit `keybindings.json` directly:

```json
[
  {
    "command": "codegraphy.fitView",
    "key": "ctrl+shift+f",
    "when": "codegraphy.graphFocused"
  }
]
```

Available commands:

| Command ID | Description |
|-----------|-------------|
| `codegraphy.open` | Open CodeGraphy |
| `codegraphy.fitView` | Fit all nodes in view |
| `codegraphy.zoomIn` | Zoom in |
| `codegraphy.zoomOut` | Zoom out |
| `codegraphy.undo` | Undo last graph action |
| `codegraphy.redo` | Redo last undone action |
| `codegraphy.exportPng` | Export graph as PNG |
| `codegraphy.exportSvg` | Export graph as SVG |
| `codegraphy.exportJson` | Export layout as JSON |
| `codegraphy.clearCache` | Clear analysis cache and refresh |

## `when` Clause Contexts

| Context | Active when |
|---------|-------------|
| `codegraphy.graphFocused` | The graph canvas has focus (not an input field) |
| `codegraphy.viewVisible` | The CodeGraphy panel is open and visible |
