---
"@codegraphy-dev/plugin-vue": minor
---

Expand Vue single-file component analysis to include lazy component imports.

Vue users now see relationships from `defineAsyncComponent(() => import(...))` and other dynamic `import()` calls inside SFC scripts. This makes route-level and component-level code splitting visible in the graph instead of only showing eager imports.
