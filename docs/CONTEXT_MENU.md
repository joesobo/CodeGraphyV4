# Context Menu

This document defines CodeGraphy's context-menu behavior and the files that own each part of the system.

## Ownership

- Rules/model: `packages/extension/src/webview/components/graphContextMenuModel.ts`
- UI wiring + event bridge: `packages/extension/src/webview/components/Graph.tsx`
- Webview message contract: `packages/extension/src/shared/types.ts`
- Runtime handler for plugin actions: `packages/extension/src/extension/GraphViewProvider.ts`

## Contexts

The menu has two runtime contexts:

- `background`: right-click on empty graph space
- `node`: right-click on a node or selected nodes

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
- Not timeline: `Reveal in Explorer`, `Add to Exclude`, `Rename...`, `Delete File`

Node context (multi):

- Always: `Open N Files`, `Copy Relative Paths`, favorite toggle
- Not timeline: `Add All to Exclude`, `Delete N Files`

## Plugin Menu Items

Plugin-contributed items (`CONTEXT_MENU_ITEMS`) are appended for single-node context only.

- Supported `when`: `node` and `both`
- Unsupported in current graph menu: `edge` (edges are not yet context targets)
- Selection dispatch: clicking a plugin item sends `PLUGIN_CONTEXT_MENU_ACTION`

## Event Flow

1. `react-force-graph` emits `onNodeRightClick` / `onBackgroundRightClick`.
2. `Graph` resolves context selection with typed helpers.
3. `Graph` dispatches a synthetic `contextmenu` event on the container so Radix menu opens even if the graph library swallows native bubbling.
4. If no graph callback fired recently, container `onContextMenu` falls back to background context.

This keeps right-click reliable in both 2D and 3D.

## Tests

- Rule/model tests: `packages/extension/tests/webview/graphContextMenuModel.test.ts`
- Integration tests (Graph + Radix + action messages): `packages/extension/tests/webview/Graph.test.tsx`
- Bug regression: `Bug #54` tests in `Graph.test.tsx` ensure menu opens from right-click callbacks in both 2D and 3D.
