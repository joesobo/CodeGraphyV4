# Plugin API types

CodeGraphy has separate type packages for separate runtime hosts.

## Core Plugin API

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

## Extension Plugin API

`@codegraphy-dev/extension-plugin-api` contains contracts for:

- Extension plugin factories and lifecycle;
- webview scripts, styles, and assets;
- Extension event payloads;
- Graph View runtime, projection, force, drag, menu, and UI contributions.

```ts
import type {
  ExtensionGraphViewContributionSet,
  IExtensionPlugin,
} from '@codegraphy-dev/extension-plugin-api';
```

The Extension decides how to style and render semantic Core data. A different
interface can define a different API and render the same Core data another way.

## Settings types

Core plugin state uses `pluginData[pluginId]`. Interface state uses an open list:

```ts
interface CodeGraphyWorkspaceInterfaceSettings {
  id: string;
  data: unknown;
}
```

Core preserves this data without knowing the interface ID or data shape.
