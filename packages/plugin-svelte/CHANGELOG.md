# @codegraphy-dev/plugin-svelte

## 0.2.0

### Minor Changes

- [#247](https://github.com/joesobo/CodeGraphyV4/pull/247) [`91e33a2`](https://github.com/joesobo/CodeGraphyV4/commit/91e33a219ab1c1db2069391525de0786921581fb) Thanks [@joesobo](https://github.com/joesobo)! - Publish the first Svelte language plugin.

  Users can install and enable `@codegraphy-dev/plugin-svelte` to analyze `.svelte` components alongside TypeScript. The plugin uses `svelte/compiler` to parse component structure, extracts module and instance script programs from the Svelte AST, and emits static import, type-import, and lazy `import()` relationships so component graphs show links between Svelte components, shared models, TypeScript entrypoints, and lazily loaded feature modules. It also contributes a default `**/.svelte-kit/**` filter so generated SvelteKit files stay out of indexed graphs unless users explicitly disable that plugin filter.

### Patch Changes

- Updated dependencies [[`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886), [`1d9180c`](https://github.com/joesobo/CodeGraphyV4/commit/1d9180c29554c163e660a7c899c59755c4b0bdff), [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561)]:
  - @codegraphy-dev/plugin-api@4.0.0
