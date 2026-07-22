# `@codegraphy-dev/plugin-api`

Type definitions for plugins hosted by CodeGraphy Core.

Use this API to extend headless analysis. Use
[`@codegraphy-dev/extension-plugin-api`](../extension-plugin-api/README.md) for
VS Code Extension and Graph View behavior.

## Install

```bash
npm install -D @codegraphy-dev/plugin-api
```

## Minimal plugin

```ts
import type { IPluginFactory } from '@codegraphy-dev/plugin-api';

const createPlugin: IPluginFactory = ({ dataHost, options } = {}) => ({
  id: 'acme.typescript-analysis',
  name: 'Acme TypeScript Analysis',
  version: '1.0.0',
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

This package is type-only. Use `import type`.

## What Core plugins can do

Core plugins can:

- analyze workspace files;
- add semantic Nodes, Symbols, and Relationships;
- add semantic Node Type and Edge Type definitions;
- declare Graph Scope capabilities and default filters;
- respond to analysis and file-change lifecycle events;
- store plugin-owned data through the provided data host.

Core plugins cannot define colors, shapes, positions, physics, webviews,
toolbars, context menus, or editor actions. Those behaviors belong to an
interface API.

Core runs its built-in analysis first, then merges active plugin results. Paths
in results are absolute workspace paths. Use `context.fileSystem` for workspace
reads when possible.

## Package descriptor

The package descriptor uses host `core`:

```json
{
  "codegraphy": {
    "plugins": [
      {
        "id": "acme.typescript-analysis",
        "host": "core",
        "entry": "./dist/plugin.js",
        "apiVersion": "^4.0.0"
      }
    ]
  }
}
```

See the [Plugin Guide](../../docs/PLUGINS.md) for registration, global and
workspace activation, multi-host packages, and settings ownership.
