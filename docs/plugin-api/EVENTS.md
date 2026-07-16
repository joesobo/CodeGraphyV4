# Event System

Historical diagram source: `docs/plugin-api/diagrams/event-system.excalidraw`

This document tracks the canonical event contract in [`packages/plugin-api/src/events.ts`](../../packages/plugin-api/src/events.ts).

Important: this is a typed payload reference, not a public subscription API. The headless plugin contract no longer exposes `CodeGraphyAPI.on(...)`; extension-owned bridges may still use these payload types internally. Not every event in the contract is emitted by the current host runtime today.

## Usage

```typescript
import type { EventName, EventPayloads } from '@codegraphy-dev/plugin-api';

function handleEvent<E extends EventName>(
  event: E,
  payload: EventPayloads[E],
): void {
  // payload is typed by event name
}
```

## Event Categories

### Graph Interaction (12)

| Event | Payload shape |
|---|---|
| `graph:nodeClick` | `{ node: { id, label }, event: { x, y } }` |
| `graph:nodeDoubleClick` | `{ node: { id, label }, event: { x, y } }` |
| `graph:nodeHover` | `{ node: { id, label } \| null }` |
| `graph:nodeHoverEnd` | `{ node: { id, label } }` |
| `graph:selectionChanged` | `{ nodes: Array<{id}>, edges: Array<{id}> }` |
| `graph:edgeClick` | `{ edge: { id, from, to }, event: { x, y } }` |
| `graph:edgeHover` | `{ edge: { id, from, to }, event: { x, y } }` |
| `graph:dragEnd` | `{ nodes: Array<{id}>, positions: Record<string, {x,y}> }` |
| `graph:zoom` | `{ level, center: { x, y } }` |
| `graph:stabilized` | `{ iterations }` |
| `graph:contextMenu` | `{ node?: {id}, edge?: {id}, position: {x,y} }` |
| `graph:backgroundClick` | `{}` |

Notes:
- `graph:nodeHover` uses `node: null` when hover leaves a node.
- `graph:backgroundClick` is currently an empty payload.

### Analysis (4)

| Event | Payload shape |
|---|---|
| `analysis:started` | `{ fileCount }` |
| `analysis:fileProcessed` | `{ filePath, connections: Array<{specifier, resolvedPath}> }` |
| `analysis:completed` | `{ graph: { nodes: Array<{id}>, edges: Array<{id}> }, duration }` |
| `analysis:error` | `{ error, filePath? }` |

Notes:
- `analysis:fileProcessed` currently emits a lightweight compatibility summary derived from the per-file analysis result. Its `connections` field is a legacy payload name; conceptually it reports discovered relationships, and it is progress-oriented, not the full symbol/relationship payload.

### Workspace / Files (6)

| Event | Payload shape |
|---|---|
| `workspace:fileCreated` | `{ filePath }` |
| `workspace:fileDeleted` | `{ filePath }` |
| `workspace:fileRenamed` | `{ oldPath, newPath }` |
| `workspace:fileChanged` | `{ filePath }` |
| `workspace:configChanged` | `{ key, value, old }` |
| `workspace:activeEditorChanged` | `{ filePath? }` |

### Views & Navigation (6)

Note:
- Several view/navigation events remain part of the typed contract for compatibility, but the current unified-graph product does not emit all of them yet.

| Event | Payload shape |
|---|---|
| `view:changed` | `{ viewId, previousId? }` |
| `view:focusChanged` | `{ filePath? }` |
| `view:folderChanged` | `{ folderPath? }` |
| `view:depthChanged` | `{ depth }` |
| `view:searchChanged` | `{ query, results: string[] }` |
| `view:physicsChanged` | `{ settings: Record<string, number> }` |

### Plugin Ecosystem (6)

Note:
- `plugin:registered` and `plugin:unregistered` are wired today.
- The other plugin events remain reserved in the public contract but are not all emitted by the current host runtime.

| Event | Payload shape |
|---|---|
| `plugin:registered` | `{ pluginId }` |
| `plugin:unregistered` | `{ pluginId }` |
| `plugin:enabled` | `{ pluginId }` |
| `plugin:disabled` | `{ pluginId }` |
| `plugin:sourceToggled` | `{ qualifiedSourceId, enabled }` |
| `plugin:message` | `{ from, to?, data }` |

## Type Entry Points

- `EventPayloads`: map of all event names to payload types.
- `EventName`: union of all keys in `EventPayloads`.

```typescript
import type { EventName, EventPayloads } from '@codegraphy-dev/plugin-api';

function on<E extends EventName>(event: E, payload: EventPayloads[E]): void {
  // typed by event name
}
```
