# `@codegraphy-vscode/plugin-api`

Type definitions for building CodeGraphy plugins.

- [CodeGraphy core extension](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy)
- [Plugin Guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Plugin lifecycle](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/LIFECYCLE.md)
- [Plugin types](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/TYPES.md)
- [Plugin events](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/plugin-api/EVENTS.md)

## Install

```bash
pnpm add -D @codegraphy-vscode/plugin-api
```

## Usage

```ts
import type { CodeGraphyAPI, IPlugin } from '@codegraphy-vscode/plugin-api';
```

This package is type-only. Use `import type` in plugin code.

The published CodeGraphy marketplace plugins use the same API surface:

- [CodeGraphy TypeScript/JavaScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-typescript)
- [CodeGraphy Python](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-python)
- [CodeGraphy C#](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-csharp)
- [CodeGraphy GDScript](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy-godot)
