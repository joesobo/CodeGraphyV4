# @codegraphy-dev/plugin-vue

## 0.3.6

### Patch Changes

- Updated dependencies [[`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962)]:
  - @codegraphy-dev/plugin-api@6.1.0

## 0.3.5

### Patch Changes

- Declare compatibility with the new CodeGraphy Plugin API 3 runtime contract.

- Updated dependencies [[`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974), [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e)]:
  - @codegraphy-dev/plugin-api@6.0.0

## 0.3.4

### Patch Changes

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now loads plugin-owned and Symbol evidence into memory when the user enables the matching Graph Scope or plugin. If Graph Cache contains the evidence, the first toggle uses 1 cache read, 0 analysis jobs, and 0 cache saves. Later off/on toggles reuse memory without more cache reads.

In the current `main` versus PR monorepo benchmark, the change reduced baseline serialized runtime cache size from 18,583,676 bytes to 10,781,465 bytes. The result uses 7,802,211 fewer bytes, a 41.98% reduction, and is 1.72 times smaller. It also keeps retained Symbol facts at 0 until the user enables Symbol scope; the previous startup retained 11,631 hidden facts.

Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

- Updated dependencies [[`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/plugin-api@5.3.0

## 0.3.3

### Patch Changes

- Updated dependencies [[`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6), [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc)]:
  - @codegraphy-dev/plugin-api@5.2.0

## 0.3.2

### Patch Changes

- [#270](https://github.com/joesobo/CodeGraphyV4/pull/270) [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b) Thanks [@joesobo](https://github.com/joesobo)! - Allow current and future Node releases while keeping Node 20 as the minimum supported runtime.

- Updated dependencies [[`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472), [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096), [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b), [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136), [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f)]:
  - @codegraphy-dev/plugin-api@5.1.0

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
