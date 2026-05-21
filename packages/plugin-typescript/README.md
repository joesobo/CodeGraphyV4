# CodeGraphy TypeScript/JavaScript

Adds TypeScript and JavaScript ecosystem metadata to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-typescript`](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript)
- Plugin API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)

## Install

Install `@codegraphy-dev/mcp` first if the `codegraphy` CLI is not already available.

```bash
npm i -g @codegraphy-dev/plugin-typescript
codegraphy plugins refresh
codegraphy plugins enable @codegraphy-dev/plugin-typescript
codegraphy index
```

## What It Provides

The built-in Tree-sitter plugin now handles JS/TS analysis inside `@codegraphy-dev/core`.
This plugin keeps the TypeScript/JavaScript ecosystem defaults that are still useful on top:

- default ignore filters for common build output and package folders
- plugin install / enable / disable state for TypeScript/JavaScript-specific defaults

Core CodeGraphy now owns the default JS/TS icons and colors through Material Icon Theme.
This plugin no longer ships general file theming.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-typescript)
