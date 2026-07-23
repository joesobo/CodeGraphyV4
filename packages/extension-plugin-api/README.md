# `@codegraphy-dev/extension-plugin-api`

Type definitions for plugins hosted by the CodeGraphy VS Code extension.

Use this API for Extension lifecycle and Graph View behavior. Use
[`@codegraphy-dev/plugin-api`](../plugin-api/README.md) for headless Core
analysis.

## Choose the correct API

| You want to | Use |
|---|---|
| Analyze files or add semantic Nodes and Relationships | `@codegraphy-dev/plugin-api` |
| Add Graph View rendering, controls, overlays, tooltips, or view-only Nodes and Edges | `@codegraphy-dev/extension-plugin-api` |
| Do both | Put one `core` descriptor and one `codegraphy.extension` descriptor in the same package |

An Extension plugin cannot add facts to the Core Relationship Graph. A Core
plugin cannot render the Graph View. If one feature needs both, keep the two
runtimes separate and let each host load its own descriptor.

## Install

```bash
npm install -D @codegraphy-dev/extension-plugin-api
```

## Minimal plugin

```ts
import type {
  IExtensionPluginFactory,
} from '@codegraphy-dev/extension-plugin-api';

const createPlugin: IExtensionPluginFactory = ({ dataHost, options } = {}) => ({
  id: 'acme.graph-tools',
  name: 'Acme Graph Tools',
  version: '1.0.0',
  apiVersion: '^1.0.0',
  webviewContributions: {
    scripts: ['dist/webview.js'],
  },
});

export default createPlugin;
```

The Extension-host factory can:

- receive merged package defaults and workspace options;
- read and write plugin-owned workspace data through `dataHost`;
- initialize when the Extension host loads it;
- publish webview scripts, styles, and assets;
- receive `onWebviewReady` after the Graph View can load its assets;
- clean up work in `onUnload`.

The factory does not receive the VS Code API, Core analysis hooks, arbitrary
workspace file access, or a general Extension event bus.

For example,
`dataHost.saveData({ pinned: true })` stores that state under the plugin's entry
in `.codegraphy/settings.json#pluginData`.

This package is type-only. Use `import type`.

## Graph View webview API

The webview activation function receives the Graph View capabilities that the
Extension implements:

```ts
import type {
  WebviewPluginActivate,
} from '@codegraphy-dev/extension-plugin-api';

const activate: WebviewPluginActivate = api => {
  const contributions = api.registerGraphViewContributions({
    runtimeNodes: [],
  });
  const overlay = api.registerOverlay('acme-status', ({ canvasContext }) => {
    api.helpers.drawBadge(canvasContext, { text: 'Acme', x: 12, y: 12 });
  });
  const viewport = api.getGraphViewViewportState();
  viewport?.reheatSimulation();

  return () => {
    contributions.dispose();
    overlay.dispose();
  };
};

export default activate;
```

The webview API supports:

- UI slots for controls and view content;
- view-only runtime Nodes, Edges, and projections;
- node renderers, overlays, and tooltips;
- Graph View context-menu contributions;
- custom force adapters and node-drag behavior;
- viewport reads, node-position updates, and simulation controls;
- plugin data reads and writes;
- notifications when the Extension refreshes plugin data or assets.

Each registration returns a disposable cleanup handle.

The webview API does not support:

- Core file analysis or changes to the persisted Relationship Graph;
- direct VS Code editor, command, terminal, or filesystem access;
- arbitrary DOM access outside the container or slot given to the plugin;
- a general subscription API for the names exported from `events.ts`.

`EventName` and `EventPayloads` document message payload vocabulary only. The
current host does not emit them through a public event subscription interface.

## Package descriptor

The package descriptor uses host `codegraphy.extension`:

```json
{
  "codegraphy": {
    "plugins": [
      {
        "id": "acme.graph-tools",
        "host": "codegraphy.extension",
        "entry": "./dist/plugin.js",
        "apiVersion": "^1.0.0"
      }
    ]
  }
}
```

Core records and activates this descriptor, but it does not import the runtime.
The VS Code extension imports it when the Extension host opens. This means the
plugin stays dormant during a CLI query.

The descriptor in `package.json` is the only plugin manifest. Do not add a
second `codegraphy.json` file.

The optional descriptor `data` value supports Graph View legend entries. An
entry can style files, semantic Nodes, or Edges:

```json
{
  "id": "acme.graph-tools",
  "host": "codegraphy.extension",
  "entry": "./dist/plugin.js",
  "apiVersion": "^1.0.0",
  "data": {
    "legendEntries": [
      {
        "id": "acme:file",
        "label": "Acme file",
        "pattern": "*.acme",
        "color": "#0EA5E9",
        "shape2D": "hexagon",
        "imagePath": "assets/acme.svg"
      },
      {
        "id": "acme:symbol:widget",
        "label": "Widget",
        "pattern": "**",
        "color": "#22C55E",
        "match": {
          "nodeType": "symbol",
          "symbolKinds": ["widget"],
          "symbolSource": "acme.core"
        }
      }
    ]
  }
}
```

Use `IExtensionPluginDescriptorData` when you create or validate this value.
Each entry needs a stable `id`, a visible `label`, a match `pattern`, and a
`color`. Use `target: "edge"` for an Edge rule. Use `match` when the rule must
match semantic Node metadata from a Core plugin. `shape2D` and `imagePath` are
Graph View presentation fields.

Core does not interpret this data or transport it through the Core plugin
registry. The Extension host reads it directly from the Extension descriptor.

The current static metadata contract does not define Core analysis settings,
arbitrary VS Code contributions, commands, editor menus, or workspace state.
Use the runtime and webview APIs described above for supported behavior.

See the [Plugin Guide](../../docs/PLUGINS.md) for the shared installation and
activation model.
