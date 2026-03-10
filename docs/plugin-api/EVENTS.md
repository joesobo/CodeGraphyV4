# Event System

![Event System Diagram](./diagrams/event-system.excalidraw)

[Open in Excalidraw](https://excalidraw.com/#json=7Nef_ISmAmCGlUbpy9dR9,U80qLewwC0CVSl7u0fVkpg)

## Subscribing to Events

Plugins subscribe via `api.on()` inside their `onLoad` hook. All events are fully typed through the `EventPayloads` interface.

```typescript
import type { CodeGraphyAPI } from '@codegraphy/plugin-api';

onLoad(api: CodeGraphyAPI) {
  // Full intellisense on the payload
  api.on('graph:nodeClick', (e) => {
    console.log(e.node.id);  // typed as IGraphNode
  });

  // One-time listener
  api.once('analysis:completed', (e) => {
    console.log(`Analyzed ${e.graph.nodes.length} files in ${e.duration}ms`);
  });

  // Manual unsubscribe
  const sub = api.on('workspace:fileChanged', handler);
  sub.dispose(); // removes this listener
}
```

All subscriptions are automatically cleaned up when the plugin unloads.

## Graph Interaction Events (12)

Events fired when users interact with the graph in the webview.

| Event | Payload | When |
|-------|---------|------|
| `graph:nodeClick` | `{ node: IGraphNode, event: { x, y } }` | User clicks a node |
| `graph:nodeDoubleClick` | `{ node: IGraphNode, event: { x, y } }` | User double-clicks a node |
| `graph:nodeHover` | `{ node: IGraphNode, event: { x, y } }` | Cursor enters a node |
| `graph:nodeHoverEnd` | `{ node: IGraphNode }` | Cursor leaves a node |
| `graph:selectionChanged` | `{ nodes: IGraphNode[], edges: IGraphEdge[] }` | Selection set changes |
| `graph:edgeClick` | `{ edge: IGraphEdge, event: { x, y } }` | User clicks an edge |
| `graph:edgeHover` | `{ edge: IGraphEdge, event: { x, y } }` | Cursor enters an edge |
| `graph:dragEnd` | `{ nodes: IGraphNode[], positions: Map<string, {x,y}> }` | User finishes dragging nodes |
| `graph:zoom` | `{ level: number, center: { x, y } }` | Zoom level changes |
| `graph:stabilized` | `{ iterations: number }` | Physics simulation stabilizes |
| `graph:contextMenu` | `{ node?: IGraphNode, edge?: IGraphEdge, position: {x,y} }` | Right-click on graph |
| `graph:backgroundClick` | `{ position: { x, y } }` | Click on empty graph area |

### Example: track hover for a heatmap

```typescript
const viewCounts = new Map<string, number>();

api.on('graph:nodeHover', (e) => {
  const count = (viewCounts.get(e.node.id) ?? 0) + 1;
  viewCounts.set(e.node.id, count);

  api.decorateNode(e.node.id, {
    badge: { text: `${count}`, color: '#f59e0b', position: 'top-right' },
  });
});
```

## Analysis Pipeline Events (4)

Events fired during workspace analysis.

| Event | Payload | When |
|-------|---------|------|
| `analysis:started` | `{ fileCount: number }` | Analysis pass begins |
| `analysis:fileProcessed` | `{ filePath: string, connections: IConnection[] }` | Individual file analyzed |
| `analysis:completed` | `{ graph: IGraphData, duration: number }` | Analysis pass finishes |
| `analysis:error` | `{ error: Error, filePath?: string }` | Analysis encounters an error |

### Example: show progress

```typescript
api.on('analysis:started', (e) => {
  api.log('info', `Analyzing ${e.fileCount} files...`);
});

api.on('analysis:completed', (e) => {
  api.log('info', `Done in ${e.duration}ms — ${e.graph.nodes.length} nodes, ${e.graph.edges.length} edges`);
});
```

## Workspace / File Events (6)

Events fired when files change in the workspace.

| Event | Payload | When |
|-------|---------|------|
| `workspace:fileCreated` | `{ filePath: string }` | New file appears |
| `workspace:fileDeleted` | `{ filePath: string }` | File removed |
| `workspace:fileRenamed` | `{ oldPath: string, newPath: string }` | File renamed or moved |
| `workspace:fileChanged` | `{ filePath: string }` | File content modified |
| `workspace:configChanged` | `{ key: string, value: unknown, old: unknown }` | CodeGraphy setting changed |
| `workspace:activeEditorChanged` | `{ filePath?: string }` | User switches editor tab |

### Example: live-update decorations on file change

```typescript
api.on('workspace:fileChanged', (e) => {
  const node = api.getNode(e.filePath);
  if (!node) return;

  // Re-read file, recompute metrics, update decoration
  const metrics = recomputeMetrics(e.filePath);
  api.decorateNode(node.id, {
    badge: { text: `${metrics.complexity}`, color: metrics.color },
  });
});
```

## Views & Navigation Events (6)

Events fired when the user changes views or navigates the graph.

| Event | Payload | When |
|-------|---------|------|
| `view:changed` | `{ viewId: string, previousId: string }` | Active view switches |
| `view:focusChanged` | `{ filePath?: string }` | Focused file changes (for depth graph) |
| `view:folderChanged` | `{ folderPath?: string }` | Selected folder changes (for subfolder view) |
| `view:depthChanged` | `{ depth: number }` | Depth slider value changes |
| `view:searchChanged` | `{ query: string, results: IGraphNode[] }` | Search query or results change |
| `view:physicsChanged` | `{ settings: PhysicsSettings }` | Physics settings adjusted |

### Example: adjust decorations based on view

```typescript
api.on('view:changed', (e) => {
  if (e.viewId === 'codegraphy.depth-graph') {
    // Only show depth-related decorations in depth view
    showDepthDecorations();
  } else {
    clearDepthDecorations();
  }
});
```

## Plugin Ecosystem Events (6)

Events fired when plugins are registered, toggled, or communicate.

| Event | Payload | When |
|-------|---------|------|
| `plugin:registered` | `{ pluginId: string, plugin: IPlugin }` | A plugin registers with the core |
| `plugin:unregistered` | `{ pluginId: string }` | A plugin is removed |
| `plugin:enabled` | `{ pluginId: string }` | A plugin is enabled |
| `plugin:disabled` | `{ pluginId: string }` | A plugin is disabled |
| `plugin:ruleToggled` | `{ qualifiedId: string, enabled: boolean }` | A detection rule is toggled |
| `plugin:message` | `{ from: string, to?: string, data: unknown }` | Inter-plugin message |

### Example: inter-plugin communication

```typescript
// Plugin A: send a message
api.on('analysis:completed', () => {
  api.emit('plugin:message', {
    from: 'my-plugin',
    to: 'other-plugin',  // optional — omit for broadcast
    data: { metrics: computedMetrics },
  });
});

// Plugin B: receive messages
api.on('plugin:message', (e) => {
  if (e.to && e.to !== 'other-plugin') return;
  console.log('Received from', e.from, e.data);
});
```

## Timeline Events (4)

Events fired when the user interacts with the git timeline feature.

| Event | Payload | When |
|-------|---------|------|
| `timeline:commitSelected` | `{ hash: string, date: string, author: string }` | User selects a commit |
| `timeline:playbackStarted` | `{ speed: number }` | Timeline playback begins |
| `timeline:playbackStopped` | `{ commitHash: string }` | Timeline playback stops |
| `timeline:rangeChanged` | `{ start: string, end: string }` | Visible time range changes |

### Example: highlight files changed in selected commit

```typescript
api.on('timeline:commitSelected', async (e) => {
  const changedFiles = await getFilesForCommit(e.hash);
  for (const filePath of changedFiles) {
    api.decorateNode(filePath, {
      border: { color: '#f59e0b', width: 3 },
      badge: { text: 'changed', color: '#f59e0b' },
    });
  }
});
```

## Typed Event Map

All events are typed through a single `EventPayloads` interface. This gives full intellisense when calling `api.on()`:

```typescript
interface EventPayloads {
  'graph:nodeClick': { node: IGraphNode; event: { x: number; y: number } };
  'graph:nodeDoubleClick': { node: IGraphNode; event: { x: number; y: number } };
  'graph:selectionChanged': { nodes: IGraphNode[]; edges: IGraphEdge[] };
  'analysis:completed': { graph: IGraphData; duration: number };
  'workspace:fileChanged': { filePath: string };
  // ... all 30+ events
}

// Usage — `e` is fully typed based on the event name
api.on('graph:nodeClick', (e) => {
  e.node.id;      // string — autocomplete works
  e.event.x;      // number
});
```

See the full type definitions in `@codegraphy/plugin-api` → `events.ts`.
