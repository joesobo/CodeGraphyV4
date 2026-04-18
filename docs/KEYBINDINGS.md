# Keyboard Shortcuts

## Graph navigation

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
| `V` | Toggle depth mode |
| `L` | Cycle layout (Default → Radial → Top Down → Left to Right) |
| `T` | Toggle 2D/3D mode |
| `Right-click` | Open context menu |

## VS Code commands

These are registered as VS Code commands and appear in the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`). You can rebind them in **File > Preferences > Keyboard Shortcuts** by searching for "CodeGraphy".

| Default Shortcut | Command | When |
|-----------------|---------|------|
| `0` | Fit All Nodes in View | Graph focused |
| `=` or `Shift+=` | Zoom In | Graph focused |
| `-` | Zoom Out | Graph focused |
| `Ctrl+Z` / `Cmd+Z` | Undo | CodeGraphy panel visible, no text input |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo | CodeGraphy panel visible, no text input |
| `Ctrl+Y` | Redo (alternate) | CodeGraphy panel visible, no text input |
| `V` | Toggle Depth Mode | Graph focused |
| `L` | Cycle Layout | Graph focused |
| `T` | Toggle 2D/3D | Graph focused |

Undo/Redo only fire when the CodeGraphy panel is active and no editor or input field has focus, so they won't conflict with normal editor undo/redo.

## Customizing shortcuts

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

See [Commands](./COMMANDS.md) for the full list of command IDs.

## `when` clause contexts

| Context | Active when |
|---------|-------------|
| `codegraphy.graphFocused` | The graph canvas has focus (not an input field) |
| `codegraphy.viewVisible` | The CodeGraphy panel is open and visible |
