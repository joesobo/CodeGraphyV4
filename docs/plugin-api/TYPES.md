# Core Plugin API types

`@codegraphy-dev/plugin-api` contains headless contracts for:

- plugin factories and plugin-owned data;
- file analysis and workspace file-system access;
- semantic Nodes, Symbols, Relationships, Node Types, and Edge Types;
- Graph Scope capabilities, filters, and update impact;
- Core analysis lifecycle hooks.

Core graph records do not contain colors, shapes, positions, physics, viewport,
webview, toolbar, or editor fields.

```ts
import type {
  IPlugin,
  IPluginFactory,
} from '@codegraphy-dev/plugin-api';
```

Use the [Extension Plugin API types](../extension-plugin-api/TYPES.md) for VS
Code Extension lifecycle and Graph View presentation contracts.
