# CodeGraphy C#

Adds C# ecosystem defaults to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-csharp`](https://www.npmjs.com/package/@codegraphy-dev/plugin-csharp)
- Plugin API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)

## Install

Install `@codegraphy-dev/core` first if the `codegraphy` CLI is not already available.

```bash
npm i -g @codegraphy-dev/plugin-csharp
codegraphy plugins register @codegraphy-dev/plugin-csharp
codegraphy plugins enable @codegraphy-dev/plugin-csharp
codegraphy index
```

## What It Provides

The built-in Tree-sitter plugin now owns C# analysis inside `@codegraphy-dev/core`.
This plugin is intentionally lightweight and only adds:

- C# ecosystem ignore filters
- workspace enablement for C#-specific defaults

Core CodeGraphy now owns the default C# icons and colors through Material Icon Theme.
This plugin no longer ships general file theming.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-csharp)
