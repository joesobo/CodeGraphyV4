# @codegraphy-dev/plugin-vue

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
