# Plugin API v2 Design

## Overview

Redesign CodeGraphy's plugin system from a narrow connection-detection interface into a full-featured, Obsidian-inspired plugin platform. Plugins become separate VS Code extensions that can detect connections, decorate nodes/edges, subscribe to events, register views, contribute context menus, and — for advanced cases — inject custom rendering code into the webview.

## Goals

- **Extensibility:** Plugins can do far more than detect imports — they can add metrics, overlays, themes, custom views, and actions.
- **Stability:** Versioned API with strict semver. Tier 1 structured API has strong backwards-compatibility guarantees.
- **Developer experience:** Full TypeScript support, typed events, JSON schema for manifests, built-in plugins as reference implementations.
- **Incremental migration:** Built-in plugins migrate to the new API. Plugins start in the monorepo, graduate to own repos once API is stable.

## Non-Goals

- Plugin marketplace or discovery UI (plugins distribute via VS Code marketplace)
- GUI plugin manager (VS Code's extension manager handles install/uninstall)
- `create-codegraphy-plugin` scaffolder (future)

## Diagrams

- **Plugin Lifecycle** — One-time phases, recurring hooks, and auto-cleanup pattern ([source](../../plugin-api/diagrams/plugin-lifecycle.excalidraw))
- **Event System** — Hub-and-spoke view of event categories and payload contracts ([source](../../plugin-api/diagrams/event-system.excalidraw))
- **Type Surface** — How `@codegraphy/plugin-api` modules map to extension/webview runtime structures ([source](../../plugin-api/diagrams/type-surface.excalidraw))

## Detailed Documentation

- **[Lifecycle](../../plugin-api/LIFECYCLE.md)** — Full lifecycle guide with code examples
- **[Events](../../plugin-api/EVENTS.md)** — Complete event catalog with usage examples
- **[Types](../../plugin-api/TYPES.md)** — All TypeScript types and interfaces

## Implementation Status (2026-03-10)

### Implemented

- Canonical event naming (colon-style keys) and shared `EventPayloads`/`EventName`.
- v2 lifecycle dispatch (`onLoad`, `onWorkspaceReady`, `onWebviewReady`, `onPreAnalyze`, `onPostAnalyze`, `onGraphRebuild`, `onUnload`).
- Tier-2 message bridge (`plugin:<pluginId>:<type>`) and webview injection plumbing.
- `@codegraphy/plugin-api` type package exports for core, events, plugin, and webview type entry points.

### Partially Implemented

- Tier-2 external asset loading works for contributed scripts/styles that resolve in the current webview context, but extension-relative resolution and resource roots still need hardening for third-party extension paths.

### Not Yet Implemented

- Semver compatibility enforcement on registration (`apiVersion` / `webviewApiVersion` range checks).
- Full adoption of `codegraphy.json` manifest as the single runtime source of truth.
- Alignment pass ensuring every host/runtime command/context/decorations contract exactly matches the public type package.

---

## 1. Repo Structure

Monorepo with npm workspaces and turborepo for build orchestration.

```
CodeGraphyV4/
├── package.json                    # root workspace
├── turbo.json                      # build/test orchestration
├── codegraphy.schema.json          # JSON schema for codegraphy.json manifests
├── packages/
│   ├── extension/                  # core VS Code extension
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── extension/          # extension host code
│   │   │   ├── webview/            # React webview app
│   │   │   ├── core/               # shared core (discovery, registry, views, colors)
│   │   │   └── shared/             # shared types
│   │   └── tests/
│   ├── plugin-api/                 # @codegraphy/plugin-api (published to NPM)
│   │   ├── package.json
│   │   └── src/
│   │       ├── index.ts            # main entry — re-exports everything
│   │       ├── plugin.ts           # IPlugin, IPluginManifest
│   │       ├── api.ts              # CodeGraphyAPI
│   │       ├── events.ts           # EventPayloads, event name constants
│   │       ├── decorations.ts      # NodeDecoration, EdgeDecoration
│   │       ├── views.ts            # IView, IViewContext
│   │       ├── connections.ts      # IConnection, IRule
│   │       ├── graph.ts            # IGraphNode, IGraphEdge, IGraphData
│   │       ├── disposable.ts       # Disposable, DisposableGroup
│   │       ├── webview/            # Tier 2 webview types
│   │       │   ├── api.ts          # CodeGraphyWebviewAPI
│   │       │   ├── renderers.ts    # NodeRenderFn, OverlayRenderFn
│   │       │   └── helpers.ts      # Drawing helper types
│   │       └── testing/            # Test utilities and mocks
│   │           └── index.ts
│   ├── plugin-typescript/          # built-in plugin
│   │   ├── package.json
│   │   ├── codegraphy.json
│   │   └── src/
│   ├── plugin-python/
│   │   ├── package.json
│   │   ├── codegraphy.json
│   │   └── src/
│   ├── plugin-csharp/
│   │   ├── package.json
│   │   ├── codegraphy.json
│   │   └── src/
│   ├── plugin-godot/
│   │   ├── package.json
│   │   ├── codegraphy.json
│   │   └── src/
│   └── plugin-markdown/
│       ├── package.json
│       ├── codegraphy.json
│       └── src/
└── docs/
```

Built-in plugins live in the monorepo during development. Once the API is stable and well-tested, they can graduate to their own repos. The core extension and types package stay in the monorepo permanently.

---

## 2. Distribution Model

Plugins are VS Code extensions that depend on CodeGraphy.

**Third-party plugin's package.json:**
```json
{
  "name": "codegraphy-metrics",
  "displayName": "Code Metrics for CodeGraphy",
  "version": "1.0.0",
  "engines": { "vscode": "^1.85.0" },
  "extensionDependencies": ["codegraphy.codegraphy"],
  "main": "./dist/extension.js",
  "devDependencies": {
    "@codegraphy/plugin-api": "^2.0.0"
  }
}
```

VS Code handles activation order — plugins activate after CodeGraphy. No custom discovery or loading system needed.

---

## 3. Plugin Manifest: `codegraphy.json`

Every plugin (built-in and third-party) includes a `codegraphy.json` manifest.

```json
{
  "$schema": "https://raw.githubusercontent.com/joesobo/CodeGraphyV4/main/codegraphy.schema.json",
  "id": "codegraphy.typescript",
  "name": "TypeScript/JavaScript",
  "version": "1.0.0",
  "apiVersion": "^2.0.0",
  "tier": 1,
  "supportedExtensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  "capabilities": ["connections", "decorations", "events", "views"],
  "rules": [
    { "id": "es6-import", "name": "ES6 Imports", "description": "import/export statements" },
    { "id": "dynamic-import", "name": "Dynamic Imports", "description": "import() expressions" },
    { "id": "commonjs-require", "name": "CommonJS Require", "description": "require() calls" },
    { "id": "reexport", "name": "Re-exports", "description": "export { } from" }
  ],
  "fileColors": {
    ".ts": "#3178C6",
    ".tsx": "#61DAFB",
    ".js": "#F7DF1E"
  },
  "defaultFilters": ["**/node_modules/**", "**/dist/**"]
}
```

**Tier 2 manifest additions:**
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

A published `codegraphy.schema.json` provides autocomplete and validation.

---

## 4. Plugin Lifecycle

### One-Time Phases

```
┌─────────────┐    ┌──────────┐    ┌────────────────────┐    ┌─────────────────┐    ┌──────────┐
│ 1. Discovery │───▶│ 2. onLoad │───▶│ 3. onWorkspaceReady │───▶│ 4. onWebviewReady │───▶│ 5. onUnload│
└─────────────┘    └──────────┘    └────────────────────┘    └─────────────────┘    └──────────┘
```

1. **Discovery** — VS Code activates the plugin extension. Plugin calls `codegraphy.registerPlugin(manifest, plugin)`.
2. **onLoad(api)** — Core validates API version compatibility, then calls `onLoad` with the full `CodeGraphyAPI`. Plugin registers event handlers, commands, views, context menu items.
3. **onWorkspaceReady(graph)** — Workspace has been analyzed. Graph data is available. Plugin can query nodes/edges, attach initial decorations. Late-registered plugins are replayed with the latest graph snapshot (deferred until plugin `initialize()` completes when applicable).
4. **onWebviewReady()** — First time the webview is ready. Tier 2 plugins' JS/CSS injections are dispatched before this fires. When a workspace is open, this runs after the first `onWorkspaceReady` dispatch. Late-registered plugins are replayed after injection dispatch (and after `initialize()` when applicable) if readiness already occurred.
5. **onUnload()** — Plugin deactivating. All registered Disposables are auto-cleaned. Plugin can do final cleanup if needed.

### Recurring Hooks

- **onPreAnalyze(files, workspaceRoot)** — Before each analysis pass. Build indexes, prepare state.
- **onPostAnalyze(graph)** — After analysis. Attach decorations, compute metrics.
- **onGraphRebuild(graph)** — Graph rebuilt without re-analysis (e.g., rule toggle). Re-apply decorations.

### Auto-Cleanup (Disposable Pattern)

Every `api.register*()` and `api.on()` call returns a `Disposable`. When `onUnload` fires, all disposables registered by that plugin are automatically disposed. No manual teardown required.

```typescript
onLoad(api: CodeGraphyAPI) {
  // All of these are auto-cleaned on unload
  api.on('graph:nodeClick', handler);           // returns Disposable
  api.registerView(myView);                      // returns Disposable
  api.registerCommand(myCommand);                // returns Disposable
  api.registerContextMenuItem(myMenuItem);       // returns Disposable
  api.decorateNode('file.ts', decoration);       // returns Disposable

  // Manual disposal if needed
  const sub = api.on('analysis:completed', handler);
  sub.dispose(); // removes just this one
}
```

---

## 5. Event System

Plugins subscribe via `api.on(eventName, handler)`. All events are fully typed through the `EventPayloads` interface.

### Graph Interaction (12 events)

| Event | Payload |
|-------|---------|
| `graph:nodeClick` | `{ node, event: { x, y } }` |
| `graph:nodeDoubleClick` | `{ node, event: { x, y } }` |
| `graph:nodeHover` | `{ node, event: { x, y } }` |
| `graph:nodeHoverEnd` | `{ node }` |
| `graph:selectionChanged` | `{ nodes[], edges[] }` |
| `graph:edgeClick` | `{ edge, event: { x, y } }` |
| `graph:edgeHover` | `{ edge, event: { x, y } }` |
| `graph:dragEnd` | `{ nodes[], positions }` |
| `graph:zoom` | `{ level, center }` |
| `graph:stabilized` | `{ iterations }` |
| `graph:contextMenu` | `{ node?, edge?, position }` |
| `graph:backgroundClick` | `{ position }` |

### Analysis Pipeline (4 events)

| Event | Payload |
|-------|---------|
| `analysis:started` | `{ fileCount }` |
| `analysis:fileProcessed` | `{ filePath, connections[] }` |
| `analysis:completed` | `{ graph, duration }` |
| `analysis:error` | `{ error, filePath? }` |

### Workspace / Files (6 events)

| Event | Payload |
|-------|---------|
| `workspace:fileCreated` | `{ filePath }` |
| `workspace:fileDeleted` | `{ filePath }` |
| `workspace:fileRenamed` | `{ oldPath, newPath }` |
| `workspace:fileChanged` | `{ filePath }` |
| `workspace:configChanged` | `{ key, value, old }` |
| `workspace:activeEditorChanged` | `{ filePath? }` |

### Views & Navigation (6 events)

| Event | Payload |
|-------|---------|
| `view:changed` | `{ viewId, previousId }` |
| `view:focusChanged` | `{ filePath? }` |
| `view:folderChanged` | `{ folderPath? }` |
| `view:depthChanged` | `{ depth }` |
| `view:searchChanged` | `{ query, results[] }` |
| `view:physicsChanged` | `{ settings }` |

### Plugin Ecosystem (6 events)

| Event | Payload |
|-------|---------|
| `plugin:registered` | `{ pluginId, plugin }` |
| `plugin:unregistered` | `{ pluginId }` |
| `plugin:enabled` | `{ pluginId }` |
| `plugin:disabled` | `{ pluginId }` |
| `plugin:ruleToggled` | `{ qualifiedId, enabled }` |
| `plugin:message` | `{ from, to?, data }` |

### Timeline (4 events)

| Event | Payload |
|-------|---------|
| `timeline:commitSelected` | `{ hash, date, author }` |
| `timeline:playbackStarted` | `{ speed }` |
| `timeline:playbackStopped` | `{ commitHash }` |
| `timeline:rangeChanged` | `{ start, end }` |

### Typed Event Subscriptions

```typescript
interface EventPayloads {
  'graph:nodeClick': { node: IGraphNode; event: { x: number; y: number } };
  'analysis:completed': { graph: IGraphData; duration: number };
  // ... all 30+ events
}

// api.on() is generic — full intellisense on payload
api.on('graph:nodeClick', (e) => {
  console.log(e.node.id); // typed as IGraphNode
});
```

---

## 6. Two-Tier Rendering

### Tier 1: Structured Decorations (Recommended)

Plugins set typed properties on nodes and edges. The core graph renderer interprets them. Stable, versioned, covers ~90% of use cases.

**NodeDecoration:**
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
    width?: number;
    style?: 'solid' | 'dashed' | 'dotted';
  };
  tooltip?: {
    sections: TooltipSection[];
  };
  label?: {
    text?: string;        // override display name
    sublabel?: string;    // secondary text below name
    color?: string;
  };
  size?: {
    scale?: number;       // multiplier (1.0 = default)
  };
  opacity?: number;       // 0.0 - 1.0
  color?: string;         // override node color
  icon?: string;          // codicon name
  group?: string;         // visual grouping id
  priority?: number;      // conflict resolution when multiple plugins decorate same node
}
```

**EdgeDecoration:**
```typescript
interface EdgeDecoration {
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  label?: { text: string; color?: string };
  particles?: { count?: number; color?: string; speed?: number };
  opacity?: number;
  curvature?: number;
  priority?: number;
}
```

**Usage:**
```typescript
api.decorateNode('src/index.ts', {
  badge: { text: '12', color: '#f07070', position: 'top-right' },
  border: { color: 'gold', width: 2 },
  tooltip: { sections: [{ title: 'Metrics', content: 'Complexity: 12' }] }
});
```

When multiple plugins decorate the same node, `priority` determines which wins per-property. Higher priority wins. Properties from different plugins that don't conflict are merged.

### Tier 2: Webview Contributions (Advanced)

For rendering that structured decorations can't express (sparklines, annotations, custom layouts). Plugins contribute JS/CSS files declared in `codegraphy.json` that get injected into the webview.

Webview code does NOT get raw DOM/canvas access. It receives a **versioned API object:**

```typescript
interface CodeGraphyWebviewAPI {
  apiVersion: number;

  // Scoped DOM container for this plugin
  getContainer(): HTMLDivElement;

  // Custom renderers (called during graph paint cycle)
  registerNodeRenderer(type: string, fn: NodeRenderFn): Disposable;
  registerOverlay(id: string, fn: OverlayRenderFn): Disposable;
  registerTooltipProvider(fn: TooltipProviderFn): Disposable;

  // High-level drawing helpers (survive renderer changes)
  helpers: {
    drawBadge(ctx: CanvasRenderingContext2D, x: number, y: number, opts: BadgeOpts): void;
    drawProgressRing(ctx: CanvasRenderingContext2D, x: number, y: number, opts: RingOpts): void;
    drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, opts: LabelOpts): void;
  };

  // Typed message channel to extension host
  sendMessage(msg: unknown): void;
  onMessage(type: string, handler: (data: unknown) => void): Disposable;
}
```

**Stability strategies:**
- Versioned API object — plugins declare `webviewApiVersion`, core warns on mismatch.
- Scoped containers — each plugin gets its own DOM container, namespaced CSS.
- Auto-cleanup — all registrations torn down when plugin unloads.
- Abstract drawing helpers — work regardless of underlying renderer.
- Sandboxed message channel — typed bus, not global state.

---

## 7. Core API Surface

The full API object plugins receive in `onLoad`:

```typescript
interface CodeGraphyAPI {
  /** Core API version (semver) */
  version: string;

  // ── Events ──
  on<E extends keyof EventPayloads>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable;
  once<E extends keyof EventPayloads>(event: E, handler: (payload: EventPayloads[E]) => void): Disposable;
  off<E extends keyof EventPayloads>(event: E, handler: (payload: EventPayloads[E]) => void): void;

  // ── Decorations ──
  decorateNode(nodeId: string, decoration: NodeDecoration): Disposable;
  decorateEdge(edgeId: string, decoration: EdgeDecoration): Disposable;
  clearDecorations(): void;

  // ── Graph Queries ──
  getGraph(): IGraphData;
  getNode(id: string): IGraphNode | null;
  getNeighbors(id: string): IGraphNode[];
  getEdgesFor(nodeId: string): IGraphEdge[];

  // ── Registration ──
  registerView(view: IView): Disposable;
  registerCommand(command: ICommand): Disposable;
  registerContextMenuItem(item: IContextMenuItem): Disposable;

  // ── Webview Communication (Tier 2) ──
  sendToWebview(msg: { type: string; data: unknown }): void;
  onWebviewMessage(handler: (msg: { type: string; data: unknown }) => void): Disposable;

  // ── Utilities ──
  getWorkspaceRoot(): string;
  log(level: 'info' | 'warn' | 'error', ...args: unknown[]): void;
}
```

---

## 8. Versioning Strategy

### Core API (Tier 1)

Follows **strict semver:**
- **Major** (2.0 → 3.0) — Breaking changes to existing hooks/types.
- **Minor** (2.1 → 2.2) — New events, decoration properties, API methods. Backwards-compatible.
- **Patch** (2.1.0 → 2.1.1) — Bug fixes only.

**Deprecation policy:** Deprecated APIs continue to work for at least 2 major versions. Deprecated APIs emit console warnings. Migration guides provided for each breaking change.

### Webview API (Tier 2)

Versioned **separately** from the core API. Weaker stability guarantees — breaking changes possible on minor versions. Plugins declare `webviewApiVersion` in their manifest.

### Compatibility Check

On `registerPlugin()`, the core checks the manifest's `apiVersion` range:
- **Compatible** → proceed normally.
- **Plugin targets future version** → error with clear message ("Plugin requires CodeGraphy API ≥3.0, but this version provides 2.x").
- **Plugin targets deprecated/unsupported version** → reject registration with migration guidance.

### Types Package Versioning

`@codegraphy/plugin-api` version is **locked to the core API version.** If the core API is 2.3.0, the types package is 2.3.0. Plugin authors install `@codegraphy/plugin-api@^2.0.0` and get type-safe access to everything available in API 2.x.

---

## 9. Plugin Registration Flow

```typescript
// Third-party plugin's extension.ts
import * as vscode from 'vscode';
import type { IPlugin, CodeGraphyAPI } from '@codegraphy/plugin-api';

export async function activate(context: vscode.ExtensionContext) {
  // Get CodeGraphy's exported API
  const cgExtension = vscode.extensions.getExtension('codegraphy.codegraphy');
  if (!cgExtension) return;

  const cg = cgExtension.isActive
    ? cgExtension.exports
    : await cgExtension.activate();

  // Register plugin
  const plugin: IPlugin = {
    // Connection detection
    detectConnections(filePath, content, workspaceRoot) {
      return detectImports(filePath, content, workspaceRoot);
    },

    onLoad(api: CodeGraphyAPI) {
      // Subscribe to events
      api.on('analysis:completed', (e) => {
        for (const node of e.graph.nodes) {
          api.decorateNode(node.id, computeDecorations(node));
        }
      });

      // Register context menu
      api.registerContextMenuItem({
        label: 'View Metrics',
        when: 'node',
        action: (node) => showMetricsPanel(node),
      });

      // Register custom view
      api.registerView({
        id: 'my-plugin.metrics-view',
        name: 'Metrics View',
        icon: 'graph',
        description: 'View files sized by complexity',
        transform(data, context) { /* ... */ return transformedData; },
      });
    },

    onWorkspaceReady(graph) {
      // Initial decoration pass
    },

    onUnload() {
      // Optional manual cleanup — disposables are auto-cleaned
    },
  };

  cg.registerPlugin(plugin);
}
```

---

## 10. Built-In Plugin Migration

All 5 built-in plugins migrate to use `registerPlugin()` — the same API as third-party plugins.

| Plugin | Scope | Showcases |
|--------|-------|-----------|
| TypeScript | Largest — 4 rules, 23 colors, AST, tsconfig | Gold standard reference |
| Python | Small — 2 rules, regex | Simple plugin baseline |
| C# | Medium — namespace resolution | Cross-file `onPreAnalyze` |
| GDScript | Medium — res:// paths, class_name | `onPreAnalyze` index building |
| Markdown | Small — wikilinks | File index + `onPreAnalyze` |

Built-in plugins ship bundled with the extension but use the same registration path. This guarantees we dogfood the API — if a built-in plugin can't do something, the API is missing a capability.

Each built-in plugin gets its own `codegraphy.json` manifest, even though they're bundled. This validates the manifest schema and serves as documentation.

---

## 11. Example Plugin Ideas (API Validation)

These plugin concepts were used to validate the API surface covers real use cases.

### Tier 1 (structured decorations only)
- **Code Metrics** — Badges with complexity/line count, tooltip sections with stats.
- **Git Blame Heatmap** — Node colors by change recency, author badges.
- **Custom Tags** — Right-click to tag files, filter/group by tag.
- **Dependency Chain Analyzer** — Highlight longest import chains, circular deps.
- **Issue Tracker Overlay** — GitHub/Jira issue count badges on files.
- **Quick Actions** — Configurable right-click actions (run tests, open terminal).
- **Architecture View** — Group nodes by module/folder, collapsible clusters.
- **Graph Themes** — Custom color schemes for presentations, dark modes.

### Tier 2 (need webview contributions)
- **Annotation Overlay** — Freehand arrows, circles, text on the graph.
- **Component Previews** — Render thumbnails on nodes.
- **Live Sparklines** — Mini charts showing commit frequency, test coverage.
- **Treemap Layout** — Alternative folder-based treemap layout.

All Tier 1 examples are achievable with: `decorateNode`, `decorateEdge`, `on()` events, `registerView`, `registerContextMenuItem`, and `registerCommand`. No Tier 2 webview injection needed.
