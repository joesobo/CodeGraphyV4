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

Core Tree-sitter Analysis handles JS/TS analysis inside `@codegraphy-dev/core`. This plugin adds TypeScript project-aware analysis and TypeScript/JavaScript ecosystem defaults:

- default ignore filters for common build output and package folders
- workspace enablement for TypeScript/JavaScript-specific defaults
- **TypeScript Alias Import** relationships from TypeScript `compilerOptions.paths`

**TypeScript Alias Import** is a plugin-owned Edge Type that Graph Scope can toggle apart from baseline import Edges. The Edge Type starts enabled. An active TypeScript plugin processes aliases so the Graph Query CLI and exports can use the same relationship data when Graph Scope hides it.

Alias import support finds the nearest ancestor `tsconfig.json` for each TypeScript source file and stops at the CodeGraphy Workspace root. It parses TypeScript JSONC files and follows relative or package-based `extends` chains. It honors `compilerOptions.baseUrl`, TypeScript inheritance, pattern precedence, exact mappings, wildcards, and ordered fallback targets. It emits no Relationship when an alias does not resolve to a workspace file. Changes to `tsconfig*.json` trigger analysis for affected TypeScript files.

Core CodeGraphy now owns the default JS/TS icons and colors through Material Icon Theme. This plugin no longer ships general file theming.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-typescript)
