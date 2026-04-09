# Event System

![Event System Diagram](./diagrams/event-system.excalidraw)

Diagram source: `docs/plugin-api/diagrams/event-system.excalidraw`

This document tracks the canonical event contract in [`packages/plugin-api/src/events.ts`](../../packages/plugin-api/src/events.ts).

## Usage

```typescript
import type { CodeGraphyAPI } from '@codegraphy-vscode/plugin-api';

export function onLoad(api: CodeGraphyAPI): void {
  api.on('graph:nodeClick', ({ node, event }) => {
    api.log('info', `Clicked ${node.id} at ${event.x},${event.y}`);
  });

  api.once('analysis:completed', ({ graph }) => {
    api.log('info', `Graph ready: ${graph.nodes.length} nodes`);
  });
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
- `analysis:fileProcessed` currently emits a lightweight compatibility summary derived from the per-file analysis result. It is progress-oriented, not the full symbol/relation payload.

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

| Event | Payload shape |
|---|---|
| `view:changed` | `{ viewId, previousId? }` |
| `view:focusChanged` | `{ filePath? }` |
| `view:folderChanged` | `{ folderPath? }` |
| `view:depthChanged` | `{ depth }` |
| `view:searchChanged` | `{ query, results: string[] }` |
| `view:physicsChanged` | `{ settings: Record<string, number> }` |

### Plugin Ecosystem (6)

| Event | Payload shape |
|---|---|
| `plugin:registered` | `{ pluginId }` |
| `plugin:unregistered` | `{ pluginId }` |
| `plugin:enabled` | `{ pluginId }` |
| `plugin:disabled` | `{ pluginId }` |
| `plugin:sourceToggled` | `{ qualifiedSourceId, enabled }` |
| `plugin:message` | `{ from, to?, data }` |

### Timeline (4)

| Event | Payload shape |
|---|---|
| `timeline:commitSelected` | `{ hash, date, author }` |
| `timeline:playbackStarted` | `{ speed }` |
| `timeline:playbackStopped` | `{ commitHash }` |
| `timeline:rangeChanged` | `{ start, end }` |

## Type Entry Points

- `EventPayloads`: map of all event names to payload types.
- `EventName`: union of all keys in `EventPayloads`.

```typescript
import type { EventName, EventPayloads } from '@codegraphy-vscode/plugin-api';

function on<E extends EventName>(event: E, payload: EventPayloads[E]): void {
  // typed by event name
}
```
