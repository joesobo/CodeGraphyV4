# Context Menu

Archived context-menu notes from before the current extension/webview refactor.

The active ownership and message-flow docs now live in:

- `packages/extension/docs/README.md`
- `packages/extension/docs/boundaries.md`
- `packages/extension/docs/messages.md`

Historical summary:

- Background, node, and edge menus are still the three runtime contexts.
- Built-in destructive actions are still hidden in timeline mode.
- Plugin-contributed menu items are still appended contextually.
- Right-click and `Ctrl+Click` still normalize to the same graph context behavior.
