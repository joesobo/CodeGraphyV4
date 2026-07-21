# Vue Example

Small Vue 3 workspace for checking CodeGraphy's Vue support.

The fixture intentionally uses several Vue SFC script patterns that a Vue plugin should parse:

- `src/App.vue` uses `<script setup lang="ts">`
- `src/components/UserCard.vue` uses normal `<script lang="ts">`
- `src/components/StatusBadge.vue` uses plain `<script setup>`
- Vue component imports use explicit `.vue` extensions
- `src/App.vue` lazy-loads `LazyProfilePanel.vue` with `defineAsyncComponent`
- TypeScript imports include composables, constants, and type-only imports

Suggested baseline check before the Vue plugin exists:

1. Open this folder in VS Code.
2. Run `CodeGraphy: Open`.
3. Capture the Graph View.

Expected baseline before Vue plugin work:

- TypeScript helper files may appear.
- `.vue` file nodes and their script imports may be missing or incomplete.
- The screenshot should show whether Core Material Theme fallback already gives `.vue` files a useful icon/color when they appear in the graph.

## Baseline Graph Screenshot

This screenshot was captured before adding the Vue plugin. It shows that `.vue` files already render as green Vue file nodes through Material Theme fallback, while the graph still misses imports inside the `.vue` script blocks.

![Vue baseline graph screenshot](../assets/graphs/vue-baseline.png)

## Files To Inspect

- `src/App.vue` imports `CounterPanel`, `UserCard`, `useCounter`, and `sampleUser`
- `src/App.vue` lazy-imports `LazyProfilePanel`
- `src/components/CounterPanel.vue` imports `StatusBadge` and `formatCount`
- `src/components/LazyProfilePanel.vue` imports `sampleUser`
- `src/components/UserCard.vue` imports the `UserProfile` type
- `src/main.ts` imports the root Vue component
- `src/types.ts` extends `DisplayEntity` from `src/inheritance.ts` so the Vue TypeScript layer can demonstrate an inheritance edge
