# CodeGraphy TypeScript/JavaScript

Adds TypeScript and JavaScript ecosystem metadata to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-typescript`](https://www.npmjs.com/package/@codegraphy-dev/plugin-typescript)
- Plugin API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)

## Install

Install `@codegraphy-dev/core` first if the `codegraphy` CLI is not already available.

```bash
npm i -g @codegraphy-dev/plugin-typescript
codegraphy plugins register @codegraphy-dev/plugin-typescript
codegraphy plugins enable @codegraphy-dev/plugin-typescript
codegraphy index
```

## What It Provides

The built-in Tree-sitter plugin now handles JS/TS analysis inside `@codegraphy-dev/core`.
This plugin keeps the TypeScript/JavaScript ecosystem defaults that are still useful on top:

- default ignore filters for common build output and package folders
- workspace enablement for TypeScript/JavaScript-specific defaults

When CodeGraphy adds project-aware TypeScript semantics, such as `compilerOptions.paths`
import resolution, this package is the intended home for emitting that additional
relationship data through Core's plugin pipeline. Alias-derived relationships should
use a TypeScript-plugin-owned edge type labeled **TypeScript Alias Import** so Graph
Scope can toggle them separately from baseline import edges. That edge type should
default on, and the plugin should process aliases whenever the TypeScript plugin is
enabled so Graph Query, MCP, and exports can use the same relationship data even
when Graph Scope hides it.

Core CodeGraphy now owns the default JS/TS icons and colors through Material Icon Theme.
This plugin no longer ships general file theming.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-typescript)
