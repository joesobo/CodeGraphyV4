# CodeGraphy Svelte

Adds Svelte component script import analysis to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-svelte`](https://www.npmjs.com/package/@codegraphy-dev/plugin-svelte)
- Plugin API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)

## Install

Install `@codegraphy-dev/core` first if the `codegraphy` CLI is not already available.

```bash
npm i -g @codegraphy-dev/plugin-svelte
codegraphy plugins register @codegraphy-dev/plugin-svelte
codegraphy plugins enable @codegraphy-dev/plugin-svelte
codegraphy index
```

## What It Provides

This plugin parses Svelte components with `svelte/compiler` and indexes relative imports from module and instance scripts.

- runtime imports become baseline import relationships
- type-only imports become type-import relationships
- dynamic `import()` calls become lazy import relationships
- explicit `.svelte` component imports resolve to Svelte component files
- TypeScript and JavaScript script imports resolve with the baseline extension candidates

This first version intentionally skips SvelteKit route semantics.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-svelte)
