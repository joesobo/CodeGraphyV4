# Context Menu

This document defines CodeGraphy's context-menu behavior and the files that own each part of the system.

## Ownership

- Rules/model (split by concern):
  - `packages/extension/src/webview/components/graphContextMenu/backgroundEntries.ts`
  - `packages/extension/src/webview/components/graphContextMenu/edgeEntries.ts`
  - `packages/extension/src/webview/components/graphContextMenu/nodeEntries.ts`
  - `packages/extension/src/webview/components/graphContextMenu/pluginEntries.ts`
  - `packages/extension/src/webview/components/graphContextMenu/entryFactories.ts`
  - `packages/extension/src/webview/components/graphContextMenu/selection.ts`
  - `packages/extension/src/webview/components/graphContextMenu/buildGraphContextMenuEntries.ts`
  - `packages/extension/src/webview/components/graphContextMenu/types.ts`
  - `packages/extension/src/webview/components/graphContextMenuModel.ts` (compatibility re-export)
- UI wiring + event bridge: `packages/extension/src/webview/components/Graph.tsx`
- Webview message contract: `packages/extension/src/shared/types.ts`
- Runtime handler for plugin actions: `packages/extension/src/extension/GraphViewProvider.ts`

## Contexts

The menu has three runtime contexts:

- `background`: right-click on empty graph space
- `node`: right-click on a node or selected nodes
- `edge`: right-click on a rendered edge

Node context supports:

- Single-node mode
- Multi-select mode
- Timeline mode restrictions (destructive file mutations hidden)

## Built-in Action Rules

Background context:

- Always: `Refresh Graph`, `Fit All Nodes`
- Not timeline: `New File...`

Node context (single):

- Always: `Open File`, `Copy Relative Path`, `Copy Absolute Path`, favorite toggle, `Focus Node`
- Not timeline: `Reveal in Explorer`, `Add to Filter`, `Rename...`, `Delete File`

Node context (multi):

- Always: `Open N Files`, `Copy Relative Paths`, favorite toggle
- Not timeline: `Add All to Filter`, `Delete N Files`

Edge context:

- Always: `Copy Source Path`, `Copy Target Path`, `Copy Both Paths`
- Timeline behavior: unchanged (edge actions are non-destructive)

## Plugin Menu Items

Plugin-contributed items (`CONTEXT_MENU_ITEMS`) are appended contextually.

- Node context: `when: node | both` (single-node context only)
- Edge context: `when: edge | both`
- Selection dispatch: clicking a plugin item sends `PLUGIN_CONTEXT_MENU_ACTION`
- Timeline behavior: plugin items are still shown in timeline mode; only built-in destructive actions are hidden.

## Event Flow

1. `react-force-graph` emits `onNodeRightClick` / `onLinkRightClick` / `onBackgroundRightClick`.
   - On macOS, control-click (`Ctrl+Click`) on node/edge/background is normalized to the same context behavior.
2. `Graph` resolves context selection with typed helpers.
3. `Graph` dispatches a synthetic `contextmenu` event on the container so Radix menu opens even if the graph library swallows native bubbling.
4. If no graph callback fired recently, container `onContextMenu` falls back to background context.

This keeps right-click reliable in both 2D and 3D.

## Tests

- Rule/model tests: `packages/extension/tests/webview/graphContextMenuModel.test.ts`
- Integration tests (Graph + Radix + action messages): `packages/extension/tests/webview/Graph.test.tsx`
- Bug regression: `Bug #54` tests in `Graph.test.tsx` ensure menu opens from right-click callbacks in both 2D and 3D.
