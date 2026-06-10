# @codegraphy-dev/plugin-vue

## 0.3.1

### Patch Changes

- [#259](https://github.com/joesobo/CodeGraphyV4/pull/259) [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12) Thanks [@joesobo](https://github.com/joesobo)! - Declare Graph Scope capabilities from first-party plugins.

  First-party plugins now use `contributeGraphScopeCapabilities(context)` so Graph Scope can show relevant plugin-owned and core controls before the current graph has matching nodes or edges.

- Updated dependencies [[`9e6b82e`](https://github.com/joesobo/CodeGraphyV4/commit/9e6b82efb9c0f6f4bfc98f199fc26262a6d6d316), [`e67468e`](https://github.com/joesobo/CodeGraphyV4/commit/e67468ecd1f13039eb930ba14344cafd25379f12)]:
  - @codegraphy-dev/plugin-api@5.0.0

## 0.3.0

### Minor Changes

- [#247](https://github.com/joesobo/CodeGraphyV4/pull/247) [`91e33a2`](https://github.com/joesobo/CodeGraphyV4/commit/91e33a219ab1c1db2069391525de0786921581fb) Thanks [@joesobo](https://github.com/joesobo)! - Expand Vue single-file component analysis to include lazy component imports.

  Vue users now see relationships from `defineAsyncComponent(() => import(...))` and other dynamic `import()` calls inside SFC scripts. This makes route-level and component-level code splitting visible in the graph instead of only showing eager imports.

### Patch Changes

- Updated dependencies [[`404b2c4`](https://github.com/joesobo/CodeGraphyV4/commit/404b2c40135152ff77dd8b0112a193f231c3f886), [`1d9180c`](https://github.com/joesobo/CodeGraphyV4/commit/1d9180c29554c163e660a7c899c59755c4b0bdff), [`712b287`](https://github.com/joesobo/CodeGraphyV4/commit/712b287b03b5a199767cf00b31f9fbf6ad302561)]:
  - @codegraphy-dev/plugin-api@4.0.0

## 0.2.0

### Minor Changes

- [#242](https://github.com/joesobo/CodeGraphyV4/pull/242) [`90be7a4`](https://github.com/joesobo/CodeGraphyV4/commit/90be7a4f5bc144b1be0abe78c17dc13514514774) Thanks [@joesobo](https://github.com/joesobo)! - Add baseline Vue SFC plugin support so `.vue` script imports are indexed in workspace graphs.
