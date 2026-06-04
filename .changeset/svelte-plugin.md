---
"@codegraphy-dev/plugin-svelte": minor
---

Publish the first Svelte language plugin.

Users can install and enable `@codegraphy-dev/plugin-svelte` to analyze `.svelte` components alongside TypeScript. The plugin uses `svelte/compiler` to parse component structure, extracts module and instance script programs from the Svelte AST, and emits static import, type-import, and lazy `import()` relationships so component graphs show links between Svelte components, shared models, TypeScript entrypoints, and lazily loaded feature modules.
