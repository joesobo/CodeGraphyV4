# Plugin API Types

All types are available from the `@codegraphy/plugin-api` package:

```typescript
import type {
  IPlugin,
  CodeGraphyAPI,
  IConnection,
  NodeDecoration,
  EdgeDecoration,
  EventPayloads,
  IView,
  IViewContext,
  IGraphNode,
  IGraphEdge,
  IGraphData,
  Disposable,
} from '@codegraphy/plugin-api';
```

## IPlugin

The main interface every plugin implements. Passed to `registerPlugin()`.

```typescript
interface IPlugin {
  /** Unique plugin identifier (e.g., 'codegraphy.typescript') */
  id: string;

  /** Semver API version range this plugin targets (e.g., '^2.0.0') */
  apiVersion: string;

  /** File extensions this plugin handles (e.g., ['.ts', '.tsx']) */
  supportedExtensions: string[];

  /** Detect connections/imports in a single file */
  detectConnections(
    filePath: string,
    content: string,
    workspaceRoot: string
  ): Promise<IConnection[]>;

  /** Called once with the full API. Register events, commands, views here. */
  onLoad?(api: CodeGraphyAPI): void;

  /** Called once when workspace analysis is complete */
  onWorkspaceReady?(graph: IGraphData): void;

  /** Called when the webview becomes visible (Tier 2 plugins) */
  onWebviewReady?(): void;

  /** Called before each analysis pass */
  onPreAnalyze?(
    files: Array<{ absolutePath: string; relativePath: string; content: string }>,
    workspaceRoot: string
  ): Promise<void>;

  /** Called after each analysis pass */
  onPostAnalyze?(graph: IGraphData): void;

  /** Called when graph is rebuilt without re-analysis (rule/plugin toggle) */
  onGraphRebuild?(graph: IGraphData): void;

  /** Called on plugin deactivation. Disposables are auto-cleaned before this. */
  onUnload?(): void;
}
```

## CodeGraphyAPI

The main API object plugins receive in `onLoad`. This is the gateway to all plugin capabilities.

```typescript
interface CodeGraphyAPI {
  /** Core API version (semver string) */
  version: string;

  // ── Events ──

  /** Subscribe to a typed event. Returns Disposable for unsubscribe. */
  on<E extends keyof EventPayloads>(
    event: E,
    handler: (payload: EventPayloads[E]) => void
  ): Disposable;

  /** Subscribe to an event, auto-removed after first fire. */
  once<E extends keyof EventPayloads>(
    event: E,
    handler: (payload: EventPayloads[E]) => void
  ): Disposable;

  /** Manually unsubscribe a handler. */
  off<E extends keyof EventPayloads>(
    event: E,
    handler: (payload: EventPayloads[E]) => void
  ): void;

  // ── Decorations ──

  /** Attach decorations to a node. Merged with existing decorations by priority. */
  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable;

  /** Attach decorations to an edge. */
  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable;

  /** Remove all decorations set by this plugin. */
  clearDecorations(): void;

  // ── Graph Queries ──

  /** Get the current graph data snapshot. */
  getGraph(): IGraphData;

  /** Get a single node by ID, or null if not found. */
  getNode(id: string): IGraphNode | null;

  /** Get all nodes directly connected to this node. */
  getNeighbors(id: string): IGraphNode[];

  /** Get all edges connected to this node. */
  getEdgesFor(nodeId: string): IGraphEdge[];

  // ── Registration ──

  /** Register a custom graph view. */
  registerView(view: IView): Disposable;

  /** Register a command (appears in VS Code command palette). */
  registerCommand(command: ICommand): Disposable;

  /** Register a context menu item on nodes/edges. */
  registerContextMenuItem(item: IContextMenuItem): Disposable;

  // ── Webview Communication (Tier 2) ──

  /** Send a message to the plugin's webview module. */
  sendToWebview(msg: { type: string; data: unknown }): void;

  /** Receive messages from the plugin's webview module. */
  onWebviewMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable;

  // ── Utilities ──

  /** Get the workspace root path. */
  getWorkspaceRoot(): string;

  /** Log a message to the CodeGraphy output channel. */
  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void;
}
```

## IConnection

Returned by `detectConnections()`. Represents a single import/dependency from one file to another.

```typescript
interface IConnection {
  /** The import specifier as written in source (e.g., './utils', 'lodash') */
  specifier: string;

  /** Resolved absolute file path, or null if external/unresolved */
  resolvedPath: string | null;

  /** Type of import */
  type: 'static' | 'dynamic' | 'require' | 'reexport';

  /** Rule that detected this connection (must match a rule id in codegraphy.json) */
  ruleId?: string;
}
```

## NodeDecoration

Structured decoration properties for graph nodes. All fields are optional. When multiple plugins decorate the same node, `priority` determines which wins per-property (higher wins). Non-conflicting properties are merged.

```typescript
interface NodeDecoration {
  badge?: {
    text: string;
    color?: string;
    bgColor?: string;
    position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    tooltip?: string;
  };

  border?: {
    color: string;
    width?: number;          // default: 2
    style?: 'solid' | 'dashed' | 'dotted';
  };

  tooltip?: {
    sections: TooltipSection[];
  };

  label?: {
    text?: string;           // override display name
    sublabel?: string;       // secondary text below name
    color?: string;
  };

  size?: {
    scale?: number;          // multiplier (1.0 = default)
  };

  opacity?: number;          // 0.0 - 1.0
  color?: string;            // override node color
  icon?: string;             // codicon name
  group?: string;            // visual grouping id
  priority?: number;         // conflict resolution (default: 0)
}

interface TooltipSection {
  title: string;
  content: string;
}
```

## EdgeDecoration

Structured decoration properties for graph edges.

```typescript
interface EdgeDecoration {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';

  label?: {
    text: string;
    color?: string;
  };

  particles?: {
    count?: number;
    color?: string;
    speed?: number;
  };

  opacity?: number;          // 0.0 - 1.0
  curvature?: number;
  priority?: number;         // conflict resolution (default: 0)
}
```

## IView

Custom graph view that transforms `IGraphData` before rendering. Plugins register views with `api.registerView()`.

```typescript
interface IView {
  /** Unique view ID (e.g., 'my-plugin.metrics-view') */
  id: string;

  /** Display name shown in the view switcher */
  name: string;

  /** Codicon icon name (without 'codicon-' prefix) */
  icon: string;

  /** Tooltip description */
  description: string;

  /** Optional: only show this view when a specific plugin is active */
  pluginId?: string;

  /** Transform graph data before rendering */
  transform(data: IGraphData, context: IViewContext): IGraphData;

  /** Optional: conditionally show/hide this view */
  isAvailable?(context: IViewContext): boolean;
}

interface IViewContext {
  focusedFile?: string;
  selectedFolder?: string;
  activePlugins: Set<string>;
  workspaceRoot?: string;
  depthLimit?: number;
}
```

## ICommand

A command registered with VS Code's command palette.

```typescript
interface ICommand {
  /** Command ID (e.g., 'my-plugin.showMetrics') */
  id: string;

  /** Display title in command palette */
  title: string;

  /** Command handler */
  action: () => void | Promise<void>;
}
```

## IContextMenuItem

A context menu item shown when right-clicking nodes or edges.

```typescript
interface IContextMenuItem {
  /** Display label */
  label: string;

  /** When to show: 'node', 'edge', or 'both' */
  when: 'node' | 'edge' | 'both';

  /** Handler — receives the node or edge that was right-clicked */
  action: (target: IGraphNode | IGraphEdge) => void | Promise<void>;

  /** Optional icon (codicon name) */
  icon?: string;

  /** Optional: group in the menu (items in the same group are visually grouped) */
  group?: string;
}
```

## IGraphNode / IGraphEdge / IGraphData

The graph data structures. Nodes represent files, edges represent imports.

```typescript
interface IGraphNode {
  id: string;            // absolute file path
  label: string;         // display name
  extension: string;     // file extension (e.g., '.ts')
  color: string;         // hex color
  x?: number;            // persisted position
  y?: number;
  imports: string[];     // raw import specifiers
}

interface IGraphEdge {
  id: string;            // unique edge identifier
  from: string;          // source node id
  to: string;            // target node id
  label?: string;
}

interface IGraphData {
  nodes: IGraphNode[];
  edges: IGraphEdge[];
}
```

## Disposable

Returned by all registration and subscription methods. Call `dispose()` to manually clean up, or let the core auto-dispose on plugin unload.

```typescript
interface Disposable {
  dispose(): void;
}
```

## Tier 2: CodeGraphyWebviewAPI

For advanced plugins that inject JS/CSS into the webview. Available as a global in the webview context. Types are in `@codegraphy/plugin-api/webview`.

```typescript
import type {
  CodeGraphyWebviewAPI,
  NodeRenderFn,
  OverlayRenderFn,
} from '@codegraphy/plugin-api/webview';

interface CodeGraphyWebviewAPI {
  /** Webview API version */
  apiVersion: number;

  /** Scoped DOM container for this plugin's overlays */
  getContainer(): HTMLDivElement;

  /** Register a custom node renderer */
  registerNodeRenderer(type: string, fn: NodeRenderFn): Disposable;

  /** Register a canvas overlay drawn on top of the graph */
  registerOverlay(id: string, fn: OverlayRenderFn): Disposable;

  /** Register a custom tooltip provider */
  registerTooltipProvider(fn: TooltipProviderFn): Disposable;

  /** High-level drawing helpers that survive renderer changes */
  helpers: {
    drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, opts: BadgeOpts): void;
    drawProgressRing(ctx: CanvasRenderingContext2D, x: number, y: number, opts: RingOpts): void;
    drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, opts: LabelOpts): void;
  };

  /** Send a message to the extension host plugin code */
  sendMessage(msg: unknown): void;

  /** Receive messages from the extension host plugin code */
  onMessage(type: string, handler: (data: unknown) => void): Disposable;
}

type NodeRenderFn = (
  node: IGraphNode,
  ctx: CanvasRenderingContext2D,
  helpers: CodeGraphyWebviewAPI['helpers']
) => void;

type OverlayRenderFn = (
  ctx: CanvasRenderingContext2D,
  graphState: { nodes: IGraphNode[]; zoom: number; center: { x: number; y: number } }
) => void;

type TooltipProviderFn = (
  node: IGraphNode
) => TooltipSection[] | null;
```

## codegraphy.json Manifest

Every plugin includes a `codegraphy.json` manifest alongside its `package.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/joesobo/CodeGraphyV4/main/codegraphy.schema.json",
  "id": "codegraphy.typescript",
  "name": "TypeScript/JavaScript",
  "version": "1.0.0",
  "apiVersion": "^2.0.0",
  "tier": 1,
  "supportedExtensions": [".ts", ".tsx", ".js", ".jsx"],
  "capabilities": ["connections", "decorations", "events", "views"],
  "rules": [
    { "id": "es6-import", "name": "ES6 Imports", "description": "import/export statements" }
  ],
  "fileColors": {
    ".ts": "#3178C6",
    ".tsx": "#61DAFB"
  },
  "defaultFilters": ["**/node_modules/**"]
}
```

Tier 2 plugins add:

```json
{
  "tier": 2,
  "webviewApiVersion": "^1.0.0",
  "webviewContributions": {
    "scripts": ["dist/webview.js"],
    "styles": ["dist/webview.css"]
  }
}
```
