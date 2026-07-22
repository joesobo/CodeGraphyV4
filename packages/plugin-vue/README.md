# CodeGraphy Vue

Adds Vue Single-File Component script import analysis to [CodeGraphy](https://marketplace.visualstudio.com/items?itemName=codegraphy.codegraphy).

- Package: [`@codegraphy-dev/plugin-vue`](https://www.npmjs.com/package/@codegraphy-dev/plugin-vue)
- Plugin API: [`@codegraphy-dev/plugin-api`](https://www.npmjs.com/package/@codegraphy-dev/plugin-api)

## Install

Install `@codegraphy-dev/core` first if the `codegraphy` CLI is not already available.

```bash
npm i -g @codegraphy-dev/plugin-vue
codegraphy plugins register @codegraphy-dev/plugin-vue
codegraphy plugins enable @codegraphy-dev/plugin-vue
codegraphy index
```

## What It Provides

This plugin parses Vue 3 Single-File Components with `@vue/compiler-sfc` and indexes relative imports from `<script>` and `<script setup>` blocks.

- runtime imports become baseline import relationships
- type-only imports become type-import relationships
- explicit `.vue` component imports resolve to Vue SFC files
- TypeScript and JavaScript script imports resolve with the baseline extension candidates

Core CodeGraphy owns the default `.vue` icon and color through Material Icon Theme. This plugin does not ship general file theming or Vue-specific graph node/edge types.

## More

- [Plugin guide](https://github.com/joesobo/CodeGraphyV4/blob/main/docs/PLUGINS.md)
- [Repository](https://github.com/joesobo/CodeGraphyV4/tree/main/packages/plugin-vue)
