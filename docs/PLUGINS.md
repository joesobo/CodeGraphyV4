# Plugin Guide

CodeGraphy has two plugin surfaces:

- marketplace plugin extensions that register themselves with the core `codegraphy.codegraphy` extension
- type-safe plugin implementations built against [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Published plugins

- [CodeGraphy core extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- [CodeGraphy Python](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python)
- [CodeGraphy C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp)
- [CodeGraphy GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot)
- [`@codegraphy-vscode/plugin-api`](https://www.npmjs.com/package/@codegraphy-vscode/plugin-api)

## Start here

- [Plugin lifecycle](./plugin-api/LIFECYCLE.md)
- [Plugin types](./plugin-api/TYPES.md)
- [Plugin events](./plugin-api/EVENTS.md)

## Packaging model

Third-party plugins should ship as their own VS Code extensions.

At activation time, the plugin extension should:

1. get the `codegraphy.codegraphy` extension export
2. activate it if needed
3. call `registerPlugin(...)` with its plugin implementation

The plugin implementation itself can live in the same VS Code extension package or in a shared library package.

## Plugin author setup

Install the type package:

```bash
pnpm add -D @codegraphy-vscode/plugin-api
```

Minimal usage:

```ts
import type { CodeGraphyAPI, IPlugin } from '@codegraphy-vscode/plugin-api';
```

Use `import type` because the package is type-only.
