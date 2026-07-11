# Plugin Lifecycle

CodeGraphy plugins are npm packages loaded by `@codegraphy-dev/core` during explicit workspace indexing. They do not activate as VS Code extensions and do not import `vscode`.

The core analysis lifecycle is headless. Plugins that also declare webview assets can target the host-agnostic `CodeGraphyWebviewAPI` from `@codegraphy-dev/plugin-api`; the VS Code extension still owns VS Code-specific bridge details internally.

## One-Time Phases

### 1. Registration

Registration reads global package metadata without importing plugin runtime code. A CodeGraphy plugin package declares package compatibility and defaults in `package.json`:

```json
{
  "name": "@codegraphy-dev/plugin-vue",
  "version": "1.2.3",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/plugin.d.ts",
      "default": "./dist/plugin.js"
    }
  },
  "codegraphy": {
    "type": "plugin",
    "apiVersion": "^2.0.0",
    "defaultOptions": {
      "includeTests": true
    },
    "disclosures": []
  }
}
```

The same package declares its static Plugin ID and display metadata in `codegraphy.json`:

```json
{
  "$schema": "./codegraphy.schema.json",
  "id": "acme.plugin",
  "name": "Acme Plugin",
  "version": "1.0.0",
  "apiVersion": "^2.0.0",
  "minCoreVersion": "1.7.0",
  "supportedExtensions": [".ts"]
}
```

`codegraphy plugins register <package>` records one globally installed plugin package in the user-level Plugin Registry after validating both files. A plugin becomes active only when its `codegraphy.json#id` is enabled in the workspace-local `plugins` array.

### 2. Runtime Load

When a workspace is indexed, core loads enabled plugin packages from their normal npm `exports` entry and validates the runtime plugin object:

```typescript
import type { IPlugin } from '@codegraphy-dev/plugin-api';

const plugin: IPlugin = {
  id: 'acme.plugin',
  name: 'Acme Plugin',
  version: '1.0.0',
  apiVersion: '^2.0.0',
  supportedExtensions: ['.ts'],
};
```

Core rejects plugins with incompatible `apiVersion` ranges or a runtime `plugin.id` that does not match `codegraphy.json#id` before analysis runs.

`codegraphy.json` is validated before the plugin module is imported. When `minCoreVersion` is newer than the running Core, CodeGraphy leaves the plugin disabled and reports the required and current versions without executing plugin code.

The host API follows semver: additive registration and lifecycle surfaces increment the minor version, while removals or contract changes require a major version. The current host is **2.2.0**. A plugin may keep a broad compatible range such as `^2.0.0`; code that calls graph-aware default groups introduced in 2.2 should declare `^2.2.0` so an older host refuses it cleanly.

### 3. Initialize

`initialize(workspaceRoot, context?)` runs once for each enabled plugin before file analysis. Use it to prepare parser state, read workspace-local configuration through `context.fileSystem`, or normalize `context.options`.

```typescript
async initialize(workspaceRoot, context) {
  const configPath = `${workspaceRoot}/acme.config.json`;
  const configText = await context?.fileSystem.readTextFile(configPath);
  this.config = configText ? JSON.parse(configText) : {};
}
```

## Host-Owned Resource Disposal

Every registration method on `IPluginHostApi` returns a `Disposable` and is automatically scoped to the plugin. For timers, watchers, parser workers, or third-party subscriptions created outside those helpers, transfer ownership explicitly:

```typescript
onLoad(api) {
  const watcher = createWatcher();
  api.registerDisposable(watcher);
}
```

The host disposes registered resources in reverse order when a plugin is disabled, reloaded, or the workspace pipeline shuts down. `onUnload` remains available for synchronous plugin-state cleanup, but resources registered with the host do not need to be manually disposed there.

## Recurring Analysis Hooks

### onPreAnalyze(files, workspaceRoot, context?)

Called before a full analysis pass with the discovered file list. Use this for workspace-wide indexes such as Markdown wikilink lookup tables, Godot `class_name` maps, or framework route manifests.

`context.mode === 'timeline'` means the file-system adapter reads a historical commit snapshot instead of the live workspace.

### analyzeFile(filePath, content, workspaceRoot, context?)

Called for each file after core has prepared the file payload. Plugins return `IFileAnalysisResult` with any mix of node type contributions, edge type contributions, extra nodes, symbols, and relationships.

```typescript
async analyzeFile(filePath, content, workspaceRoot, context) {
  return {
    filePath,
    symbols: [
      {
        id: `${filePath}:function:buildInvoice`,
        name: 'buildInvoice',
        kind: 'function',
        filePath,
      },
    ],
    relations: [
      {
        kind: 'reference',
        sourceId: 'reference',
        fromFilePath: filePath,
        fromSymbolId: `${filePath}:function:buildInvoice`,
        toFilePath: '/repo/src/shared/money.ts',
        toSymbolId: '/repo/src/shared/money.ts:function:formatMoney',
        specifier: './shared/money',
      },
    ],
  };
}
```

Path contract:

- `filePath` and `fromFilePath` are absolute workspace paths.
- Resolved `toFilePath` values are absolute workspace paths.
- Unresolved package or runtime targets use `toFilePath: null`.
- `sourceId` is plugin-local, like `import`, `reference`, `preload`, or `wikilink`; the host qualifies provenance later.

### onFilesChanged(files, workspaceRoot, context?)

Called before an incremental save-driven re-analysis when CodeGraphy already has a warm Graph Cache. Return additional workspace-relative files when dependents also need analysis.

```typescript
async onFilesChanged(files, workspaceRoot, context) {
  let needsDependents = false;

  for (const file of files) {
    needsDependents ||= updateLocalIndex(file.relativePath, file.content);
  }

  return needsDependents ? ['src/runtime/container.ts'] : [];
}
```

If a plugin only implements `onPreAnalyze(...)` and not `onFilesChanged(...)`, CodeGraphy can fall back to a full re-index for safety.

### onPostAnalyze(graph)

Called after analysis completes and the graph has been projected. Use this for headless bookkeeping that depends on the final graph shape.

### onGraphRebuild(graph)

Called when cached relationship data is projected again without re-running file analysis, such as after Graph Scope settings or plugin toggles change.

### onWorkspaceReady(graph)

Called once the workspace graph is ready. Headless plugins should treat this as a notification hook rather than a UI entry point.

### onUnload()

Called when the plugin is unloaded. Close parser workers, flush plugin-owned caches, and release resources that are not owned by the host.

## Full Lifecycle Example

```typescript
import type { IPlugin } from '@codegraphy-dev/plugin-api';

export function createMetricsPlugin(): IPlugin {
  return {
    id: 'codegraphy-metrics',
    name: 'Metrics',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['*'],

    async initialize(workspaceRoot, context) {
      await warmParserState(workspaceRoot, context?.options);
    },

    async onFilesChanged(files) {
      return files.map((file) => file.relativePath);
    },

    async analyzeFile(filePath) {
      return {
        filePath,
        relations: [],
      };
    },

    onPostAnalyze(graph) {
      rememberLatestMetrics(graph);
    },

    onUnload() {
      clearMetricsCache();
    },
  };
}
```
