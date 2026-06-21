# Svelte Example

Tiny Svelte workspace for checking CodeGraphy's Svelte plugin support.

Open `examples/example-svelte` in CodeGraphy and look for:

- `src/App.svelte -> src/loadFeature.ts#import`
- `src/App.svelte -> src/components/UserCard.svelte#import`
- `src/App.svelte -> src/components/LazyPanel.svelte#import`
- `src/App.svelte -> src/types.ts#type-import`
- `src/types.ts -> src/inheritance.ts#inherit`

## Files To Inspect

- `src/App.svelte` uses module and instance scripts.
- `src/App.svelte` lazy-loads `LazyPanel.svelte` with dynamic `import()`.
- `src/components/UserCard.svelte` imports a type from `src/types.ts`.
- `src/types.ts` extends a shared display interface from `src/inheritance.ts`.
