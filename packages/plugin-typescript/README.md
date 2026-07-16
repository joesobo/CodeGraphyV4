# CodeGraphy TypeScript/JavaScript

Adds TypeScript project-aware alias import relationships and TypeScript/JavaScript ecosystem metadata to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

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

Core Tree-sitter Analysis now handles JS/TS analysis inside `@codegraphy-dev/core`.
This plugin contributes TypeScript project-aware analysis and TypeScript/JavaScript
ecosystem defaults on top:

- default ignore filters for common build output and package folders
- workspace enablement for TypeScript/JavaScript-specific defaults
- **TypeScript Alias Import** relationships from TypeScript `compilerOptions.paths`

**TypeScript Alias Import** is a plugin-owned edge type that Graph Scope can toggle
separately from baseline import edges. The edge type defaults on, and the plugin
processes aliases whenever the TypeScript plugin is enabled so Graph Query CLI and
exports can use the same relationship data even when Graph Scope hides it.

Alias import support finds the nearest ancestor `tsconfig.json` for each TypeScript
source file, stopping at the CodeGraphy Workspace root. It parses normal TypeScript
JSONC config files, follows local relative and package-based `extends` chains,
honors `compilerOptions.baseUrl`, reads `compilerOptions.paths` with TypeScript
inheritance and pattern precedence, supports exact and wildcard mappings, honors
fallback target arrays in order, and emits no relationship when an alias cannot
resolve to a workspace file. Changes to `tsconfig*.json` re-analyze affected
TypeScript files.

Core CodeGraphy now owns the default JS/TS icons and colors through Material Icon Theme.
This plugin no longer ships general file theming.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-typescript)
