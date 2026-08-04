# Keyboard Shortcuts

## Graph navigation

These shortcuts work when the Graph View is focused and no text input is active.

| Shortcut | Action |
|----------|--------|
| `0` | Fit all nodes in view |
| `+` / `=` | Zoom in |
| `-` | Zoom out |
| `Ctrl+A` / `Cmd+A` | Select all nodes |
| `Escape` | Dismiss the top Graph View layer; deselect all Nodes when no layer is open |
| `Enter` | Open selected node(s) in editor |
| `Cmd+Click` (macOS) / `Ctrl+Click` (Windows and Linux) | Add/remove node from selection |
| `Shift+Drag` | Box selection |
| `V` | Toggle Depth Mode |
| `Right-click` and release without dragging | Open context menu |

## VS Code commands

VS Code registers these actions as commands and shows them in the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`). To rebind one, open **File > Preferences > Keyboard Shortcuts** and search for "CodeGraphy".

| Default Shortcut | Command | When |
|-----------------|---------|------|
| `0` | Fit All Nodes in View | Graph focused |
| `=` or `Shift+=` | Zoom In | Graph focused |
| `-` | Zoom Out | Graph focused |
| `Ctrl+Z` / `Cmd+Z` | Undo | CodeGraphy panel visible, no text input |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo | CodeGraphy panel visible, no text input |
| `Ctrl+Y` | Redo (alternate) | CodeGraphy panel visible, no text input |
| `V` | Toggle Depth Mode | Graph focused |

Undo/Redo only fire when the CodeGraphy panel is active and no editor or input field has focus, so they won't conflict with normal editor undo/redo.

## Escape dismissal order

Escape dismisses one layer per press. CodeGraphy uses this order:

1. Close the active context menu, dropdown, popover, or dialog.
2. Cancel the Legend rule prompt.
3. Let the focused edit control handle Escape, or blur it.
4. Close Filters.
5. Close the active built-in or plugin panel and focus the Graph Stage.
6. Clear Node selection when only the Graph Stage remains.

Closing a popup or panel does not also clear selection or change graph settings. A
held Escape key does not dismiss more than one layer.

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
| `codegraphy.graphFocused` | The Graph Stage has focus (not an input field) |
| `codegraphy.viewVisible` | The CodeGraphy panel is open and visible |
