# Plugin Guide

CodeGraphy has one plugin installation and activation system. Each runtime host
has a small API for the behavior that it owns.

- [`@codegraphy-dev/plugin-api`](../packages/plugin-api/README.md) extends
  headless Core analysis.
- [`@codegraphy-dev/extension-plugin-api`](../packages/extension-plugin-api/README.md)
  extends the VS Code extension and Graph View.

## The basic model

There are three separate steps:

1. **Register a package.** CodeGraphy records its plugin descriptors in
   `~/.codegraphy/plugins.json`. They start disabled.
2. **Enable a plugin.** Set it globally, or set a workspace override in
   `.codegraphy/settings.json`.
3. **Open a host.** Core or an interface loads only the active plugins for its
   own host.

An enabled plugin does not always run. For example, the particles plugin can be
enabled while you use the CLI. A CLI query does not load it because its host is
`codegraphy.extension`. The VS Code extension loads it when the Extension host
starts.

## Register and enable

```bash
npm install -g @codegraphy-dev/core
npm install -g @codegraphy-dev/plugin-vue
codegraphy plugins register @codegraphy-dev/plugin-vue
codegraphy plugins enable @codegraphy-dev/plugin-vue
```

Commands use the current directory as the workspace. Use `-C` to select a
different workspace:

```bash
codegraphy -C /path/to/workspace plugins enable @codegraphy-dev/plugin-vue
```

A registered plugin has a global enabled value. A workspace plugin entry can
use one of these activation values:

| Value | Result |
|---|---|
| `inherit` | Use the global value. |
| `enabled` | Enable it in this workspace. |
| `disabled` | Disable it in this workspace. |

An explicit workspace value wins over the global value.

## Package contract

A package declares one or more plugin descriptors in
`package.json#codegraphy.plugins`:

```json
{
  "name": "@acme/codegraphy-tools",
  "version": "1.2.3",
  "type": "module",
  "codegraphy": {
    "plugins": [
      {
        "id": "acme.typescript-analysis",
        "name": "Acme TypeScript Analysis",
        "host": "core",
        "entry": "./dist/core.js",
        "apiVersion": "^4.0.0",
        "data": {
          "defaultOptions": {
            "mode": "strict"
          },
          "updateImpact": {
            "toggle": "reanalyze-plugin-files",
            "defaultSetting": "reanalyze-plugin-files"
          }
        }
      },
      {
        "id": "acme.graph-tools",
        "name": "Acme Graph Tools",
        "host": "codegraphy.extension",
        "entry": "./dist/extension.js",
        "apiVersion": "^1.0.0"
      }
    ]
  }
}
```

The host is an open string. Core understands `core`, and the VS Code extension
understands `codegraphy.extension`. A future interface can define a different
host without adding it to a Core enum.

One package can contain descriptors for several hosts. Each descriptor is one
installed plugin record and has its own stable ID.

`package.json#codegraphy.plugins` is the only plugin manifest. Do not repeat
the descriptor in `codegraphy.json`.

The optional `data` value belongs to the descriptor. Core reads only its own
plugin defaults and update impact. An interface can read its matching entry in
the open `interfaces` list without adding interface keys to Core.

## Core plugins

Core plugins add semantic information. They can analyze files, add Nodes and
Relationships, define semantic Node Types and Edge Types, add filters, and keep
plugin-owned data.

```ts
import type { IPluginFactory } from '@codegraphy-dev/plugin-api';

const createPlugin: IPluginFactory = ({ dataHost, options } = {}) => ({
  id: 'acme.typescript-analysis',
  name: 'Acme TypeScript Analysis',
  version: '1.2.3',
  apiVersion: '^4.0.0',
  supportedExtensions: ['.ts', '.tsx'],
  async initialize() {
    await dataHost?.saveData({ mode: options?.mode ?? 'default' });
  },
  async analyzeFile(filePath) {
    return { filePath, relations: [] };
  },
});

export default createPlugin;
```

Use `import type`. The Core Plugin API is type-only. It does not contain
rendering, color, webview, editor, toolbar, or Graph View contracts.

## Extension plugins

Extension plugins add VS Code Extension or Graph View behavior. The particles
plugin is an Extension plugin.

```ts
import type {
  IExtensionPluginFactory,
} from '@codegraphy-dev/extension-plugin-api';

const createPlugin: IExtensionPluginFactory = () => ({
  id: 'acme.graph-tools',
  name: 'Acme Graph Tools',
  version: '1.2.3',
  apiVersion: '^1.0.0',
  webviewContributions: {
    scripts: ['dist/webview.js'],
  },
});

export default createPlugin;
```

The Extension host imports this runtime. Core only reports that the descriptor
is installed and active.

Interface-specific static metadata also belongs to the interface. For example,
the Unity descriptor stores VS Code Extension file colors in its opaque `data`
envelope. Each descriptor owns its metadata, so two plugins in one package can
use different colors:

```json
{
  "id": "acme.unity",
  "host": "core",
  "entry": "./dist/plugin.js",
  "apiVersion": "^4.0.0",
  "data": {
    "interfaces": [{
      "id": "codegraphy.extension",
      "data": { "fileColors": { "*.unity": "#F97316" } }
    }]
  }
}
```

## Workspace data

Core plugin data stays under `pluginData[pluginId]`.

Interface-owned data uses the open `interfaces` list:

```json
{
  "interfaces": [
    {
      "id": "codegraphy.extension",
      "data": {
        "pinnedNodes": [
          { "id": "src/app.ts", "x": 120, "y": 80 }
        ]
      }
    }
  ]
}
```

Core preserves each `id` and `data` value. It does not define interface IDs or
data keys.

Store user intent that must survive a restart. A pinned Node position is a good
example. Temporary physics positions and derived colors normally should not be
stored.

## Local development

CodeGraphy does not require a specific bundler. Build each descriptor `entry`
as an ECMAScript module and emit the public type declarations for your package.
The built-in workspace packages use one repository script:

```json
{
  "scripts": {
    "build": "node ../../scripts/build-plugin-package.mjs"
  }
}
```

That command is a repository convenience, not part of the public plugin
contract. External plugins can use `tsc`, esbuild, Vite, or another tool.

```bash
codegraphy plugins link /path/to/acme-codegraphy-tools
codegraphy -C /path/to/workspace plugins enable acme.typescript-analysis
codegraphy -C /path/to/workspace index
```

When you use F5, launch only the CodeGraphy VS Code extension. The extension
loads active package plugins through the shared registry.
