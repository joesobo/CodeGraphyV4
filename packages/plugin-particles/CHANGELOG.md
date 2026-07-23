# @codegraphy-dev/plugin-particles

## 0.2.5

### Patch Changes

- [#317](https://github.com/joesobo/CodeGraphyV4/pull/317) [`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa) Thanks [@joesobo](https://github.com/joesobo)! - Use one global and workspace plugin activation model for every runtime host.
  Keep Core plugins headless, move VS Code Extension contracts to the Extension
  Plugin API, and load active host-specific plugins only when that host opens.

  Remove rendering fields and persisted view state from Core graph data. Let each
  interface own its rendering and preserve optional interface data through the
  open workspace `interfaces` list.

  Ship Godot and Unity as dual-host packages. Their Core entries own analysis and
  semantic graph types. Their Extension entries own Graph View Legend colors,
  shapes, and icons.

- Updated dependencies [[`cc4e303`](https://github.com/joesobo/CodeGraphyV4/commit/cc4e303350145d117142d012c3e55a910d147bfa)]:
  - @codegraphy-dev/extension-plugin-api@1.1.0

## 0.2.4

### Patch Changes

- Updated dependencies [[`ae8cbcd`](https://github.com/joesobo/CodeGraphyV4/commit/ae8cbcdd2b75cbf3e16475608727dbba96039962)]:
  - @codegraphy-dev/plugin-api@6.1.0

## 0.2.3

### Patch Changes

- Declare compatibility with the new CodeGraphy Plugin API 3 runtime contract.

- Updated dependencies [[`b744f20`](https://github.com/joesobo/CodeGraphyV4/commit/b744f20bb1391e9a0c40d3e448a4f3f78bde4974), [`5a65047`](https://github.com/joesobo/CodeGraphyV4/commit/5a65047d1a715f005760ace0ebf0f550a16efa2e)]:
  - @codegraphy-dev/plugin-api@6.0.0

## 0.2.2

### Patch Changes

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now loads plugin-owned and Symbol evidence into memory when the user enables the matching Graph Scope or plugin. If Graph Cache contains the evidence, the first toggle uses 1 cache read, 0 analysis jobs, and 0 cache saves. Later off/on toggles reuse memory without more cache reads.

In the current `main` versus PR monorepo benchmark, the change reduced baseline serialized runtime cache size from 18,583,676 bytes to 10,781,465 bytes. The result uses 7,802,211 fewer bytes, a 41.98% reduction, and is 1.72 times smaller. It also keeps retained Symbol facts at 0 until the user enables Symbol scope; the previous startup retained 11,631 hidden facts.

Plugin authors can now declare whether toggles and plugin-owned settings are visual-only, settings-only, projection-only, plugin-file analysis, or full-index changes. All built-in plugins declare this metadata so plugin toggles use the fastest correct path without stale graph output.

- Updated dependencies [[`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f)]:
  - @codegraphy-dev/plugin-api@5.3.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`17bda07`](https://github.com/joesobo/CodeGraphyV4/commit/17bda07e5f1211a0ba9345eb4765058a1c4e77b6), [`b8db94a`](https://github.com/joesobo/CodeGraphyV4/commit/b8db94af4083885db787feb9b4ac43d04bbff9dc)]:
  - @codegraphy-dev/plugin-api@5.2.0

## 0.2.0

### Minor Changes

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096) Thanks [@joesobo](https://github.com/joesobo)! - Add the first CodeGraphy Particles plugin with graph background particle presets.

An active plugin adds a Particles section to the Theme popup. Users can choose Synapse, Rain, Constellations, Perlin Flow, Leaves, Sparkles, Embers, Snow, or workspace TypeScript effects behind the Relationship Graph.

Users can add their own effects in `.codegraphy/particles/`; CodeGraphy compiles them for the plugin and shows them alongside the built-in presets. The examples include an orange Fireflies effect under `examples/.codegraphy/particles/`.

### Patch Changes

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136) Thanks [@joesobo](https://github.com/joesobo)! - Dispose webview plugin work when the host disables a plugin or resets its webview assets.

Webview plugin `activate(api)` functions can now return a cleanup function or `Disposable`. CodeGraphy calls that cleanup during plugin disable/reset so plugin-owned UI can stop timers, animation loops, message subscriptions, and injected DOM without waiting for a webview reload.

The Particles plugin now uses that cleanup path when the host disables it. The plugin stops background effects, clears Theme controls, unsubscribes from data updates, and removes injected styles.

- Updated dependencies [[`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472), [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096), [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b), [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136), [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f)]:
  - @codegraphy-dev/plugin-api@5.1.0

## 0.1.0

- Add graph background particle effect presets for the CodeGraphy Graph Stage.
