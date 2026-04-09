# Plugin Lifecycle

![Plugin Lifecycle Diagram](./diagrams/plugin-lifecycle.excalidraw)

[Open in Excalidraw](https://excalidraw.com/#json=E_nILqzLfKdU_NKoiu92k,chSfru6ee8Hp_697-H8Vsw)

## One-Time Phases

Every plugin goes through these phases exactly once, in order:

### 1. Discovery

The plugin's VS Code extension activates. It grabs CodeGraphy's exported API and calls `registerPlugin()`.

```typescript
import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
  const cg = vscode.extensions.getExtension('codegraphy.codegraphy');
  if (!cg) return;

  const api = cg.isActive ? cg.exports : await cg.activate();
  api.registerPlugin(myPlugin, { extensionUri: context.extensionUri });
}
```

At this point the core validates the plugin's `apiVersion` from its `codegraphy.json` manifest:

- Compatible version range: proceed.
- Future version: error with clear message.
- Unsupported/deprecated version: reject registration with a migration message.

### 2. onLoad(api)

The core calls `onLoad` with the full `CodeGraphyAPI` object. This is where the plugin sets up everything it needs:

```typescript
onLoad(api: CodeGraphyAPI) {
  // Subscribe to events
  api.on('graph:nodeClick', (e) => { /* ... */ });

  // Register commands
  api.registerCommand({
    id: 'my-plugin.doThing',
    title: 'Do Thing',
    action: () => { /* ... */ },
  });

  // Register context menu items
  api.registerContextMenuItem({
    label: 'View Details',
    when: 'node',
    action: (node) => { /* ... */ },
  });

  // Register an optional compatibility graph transform
  api.registerView({
    id: 'my-plugin.custom-view',
    name: 'My View',
    icon: 'graph',
    description: 'A plugin-defined graph transform',
    recomputeOn: ['focusedFile'],
    transform(data, context) { return data; },
  });

  // Register an exporter
  api.registerExporter({
    id: 'my-plugin.export.summary',
    label: 'Summary Export',
    async run() {
      const graph = api.getGraph();
      await api.saveExport({
        filename: 'summary.json',
        content: JSON.stringify(graph, null, 2),
      });
    },
  });

  // Register a dedicated toolbar button with plugin-owned actions
  api.registerToolbarAction({
    id: 'my-plugin.tools',
    label: 'Plugin Tools',
    items: [
      {
        id: 'open-summary',
        label: 'Open Summary',
        run: async () => {
          await showSummaryPanel(api.getGraph());
        },
      },
    ],
  });
}
```

`registerView(...)` still exists in the API, but treat it as a compatibility / future-facing hook. The current built-in UI stays on one unified graph surface instead of surfacing plugin-defined views as a primary product concept.

Every `api.on()`, `api.register*()`, and `api.decorateNode/Edge()` call returns a `Disposable`. See [Auto-Cleanup](#auto-cleanup-disposable-pattern) below.

### 3. onWorkspaceReady(graph)

Called once the workspace has been analyzed and graph data is available. The plugin can now query nodes/edges and attach initial decorations.

If a plugin is registered after this phase already happened, CodeGraphy replays `onWorkspaceReady` with the latest graph snapshot (Obsidian-style "run now if already ready"). For externally-registered plugins, replay is deferred until `initialize()` completes when applicable.

```typescript
onWorkspaceReady(graph: IGraphData) {
  for (const node of graph.nodes) {
    const metrics = computeMetrics(node);
    api.decorateNode(node.id, {
      badge: { text: `${metrics.complexity}`, color: '#f07070' },
    });
  }
}
```

### 4. onWebviewReady()

Called the first time the webview is ready. For Tier 2 plugins, this means contributed JS/CSS injections were dispatched and `CodeGraphyWebviewAPI` is available in the webview context.

When a workspace is open, this runs after the first `onWorkspaceReady` dispatch.

If a plugin is registered after the webview is already ready, CodeGraphy replays `onWebviewReady` for that plugin after Tier-2 injection dispatch and (when applicable) `initialize()` completion.

### 5. onUnload()

Called when the plugin is deactivating. All registered Disposables are auto-cleaned before this runs. Use this only for cleanup that the Disposable pattern doesn't cover.

```typescript
onUnload() {
  // Optional: close external connections, flush caches, etc.
}
```

## Recurring Hooks

These hooks are called multiple times during the plugin's lifetime:

### onPreAnalyze(files, workspaceRoot)

Called before each analysis pass with the full list of discovered files. Use this to build workspace-wide indexes needed for cross-file resolution.

```typescript
onPreAnalyze(files, workspaceRoot) {
  // Build a lookup map, parse config files, etc.
  this.fileIndex = new Map();
  for (const f of files) {
    this.fileIndex.set(f.relativePath, f);
  }
}
```

**Example:** The GDScript plugin uses this to build a `class_name` map so `extends Player` resolves to the correct file. The Markdown plugin builds a file index for wikilink resolution.

### analyzeFile(filePath, content, workspaceRoot)

Called for each file after the core has prepared the file payload. Plugins return a per-file analysis object containing any mix of:

- node type contributions
- edge type contributions
- analysis nodes
- symbols
- relations

The host merges core output first and then plugin output in plugin priority order.

Plugins that contribute code analysis should implement this hook.

```typescript
async analyzeFile(filePath, content, workspaceRoot) {
  return {
    filePath,
    symbols: [
      {
        id: `${filePath}:mySymbol`,
        name: 'mySymbol',
        kind: 'function',
        filePath,
      },
    ],
    relations: [
      {
        kind: 'reference',
        sourceId: 'my-plugin:reference',
        fromFilePath: filePath,
        toFilePath: 'README.md',
      },
    ],
  };
}
```

### onPostAnalyze(graph)

Called after analysis completes with the full graph data. Use this to attach decorations, compute metrics, or update badges based on the latest graph state.

```typescript
onPostAnalyze(graph: IGraphData) {
  for (const node of graph.nodes) {
    api.decorateNode(node.id, computeDecorations(node));
  }
}
```

### onGraphRebuild(graph)

Called when the graph is rebuilt without re-analysis (for example after graph-control toggles or plugin toggles). The cached connection data is used to rebuild the graph. Plugins should re-apply their decorations since the rendered node set may have changed.

```typescript
onGraphRebuild(graph: IGraphData) {
  // Same logic as onPostAnalyze — re-apply decorations
  api.clearDecorations();
  for (const node of graph.nodes) {
    api.decorateNode(node.id, computeDecorations(node));
  }
}
```

## Auto-Cleanup (Disposable Pattern)

Inspired by Obsidian's `register()` pattern and VS Code's `Disposable` system. Every registration returns a `Disposable`:

```typescript
interface Disposable {
  dispose(): void;
}
```

When `onUnload` fires, **all** Disposables registered by that plugin are automatically disposed. Event subscriptions are removed, commands are unregistered, plugin-defined views/transforms are removed, decorations are cleared, and webview contributions are torn down. No manual cleanup needed.

```typescript
onLoad(api: CodeGraphyAPI) {
  // All of these auto-clean on unload:
  api.on('graph:nodeClick', handler);
  api.registerView(myView);
  api.registerCommand(myCommand);
  api.registerContextMenuItem(myMenuItem);
  api.registerExporter(myExporter);
  api.registerToolbarAction(myToolbarAction);
  api.decorateNode('file.ts', decoration);

  // Manual disposal if needed during runtime:
  const sub = api.on('analysis:completed', handler);
  sub.dispose(); // removes just this subscription
}
```

## Full Lifecycle Example

```typescript
import type { IPlugin, CodeGraphyAPI, IGraphData } from '@codegraphy-vscode/plugin-api';

export function createMetricsPlugin(): IPlugin {
  let api: CodeGraphyAPI;

  return {
    id: 'codegraphy-metrics',
    name: 'Metrics',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: [],

    async analyzeFile(filePath, content, workspaceRoot) {
      return {
        filePath,
        relations: [],
      };
    },

    onLoad(_api) {
      api = _api;

      api.on('workspace:fileChanged', (e) => {
        // Re-compute metrics for changed file
        const node = api.getNode(e.filePath);
        if (node) {
          api.decorateNode(node.id, computeDecorations(node));
        }
      });

      api.registerContextMenuItem({
        label: 'View Metrics',
        when: 'node',
        action: (node) => showMetricsPanel(node),
      });

      api.registerExporter({
        id: 'codegraphy-metrics.export',
        label: 'Metrics Snapshot',
        async run() {
          await api.saveExport({
            filename: 'metrics.json',
            content: JSON.stringify(api.getGraph(), null, 2),
          });
        },
      });

      api.registerToolbarAction({
        id: 'codegraphy-metrics.tools',
        label: 'Metrics',
        items: [
          {
            id: 'open-metrics-panel',
            label: 'Open Metrics Panel',
            run: () => showMetricsPanel(api.getGraph()),
          },
        ],
      });
    },

    onPostAnalyze(graph) {
      for (const node of graph.nodes) {
        api.decorateNode(node.id, computeDecorations(node));
      }
    },

    onGraphRebuild(graph) {
      api.clearDecorations();
      for (const node of graph.nodes) {
        api.decorateNode(node.id, computeDecorations(node));
      }
    },

    onUnload() {
      // Everything auto-cleaned
    },
  };
}
```
