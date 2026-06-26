# @codegraphy-dev/plugin-particles

## 0.2.2

### Patch Changes

- [#295](https://github.com/joesobo/CodeGraphyV4/pull/295) [`710858c`](https://github.com/joesobo/CodeGraphyV4/commit/710858ce3cad87c85b1abded24857ad3ccab5b9f) Thanks [@joesobo](https://github.com/joesobo)! - Graph View now keeps plugin-owned evidence and symbol evidence out of runtime memory until the user enables the matching Graph Scope or plugin. If the evidence is already in Graph Cache, the first toggle hydrates it with 1 cache read, 0 analysis jobs, and 0 cache saves; later off/on toggles reuse memory with 0 additional cache reads.

  On the current `main` versus PR CodeGraphy monorepo benchmark, baseline runtime cache size improved from 18,583,676 serialized bytes to 10,781,465 serialized bytes: 7,802,211 bytes less, a 41.98% reduction, and 1.72x smaller. Retained symbol facts stay at 0 until Symbol scope is enabled instead of retaining 11,631 hidden symbol facts on startup.

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

  When the plugin is enabled, it adds a Particles section to the Theme popup and lets users toggle Synapse, Rain, Constellations, Perlin Flow, Leaves, Sparkles, Embers, Snow, and workspace custom TypeScript effects behind the Relationship Graph nodes and edges.

  Users can add their own effects in `.codegraphy/particles/`; CodeGraphy compiles them for the plugin and shows them alongside the built-in presets. The examples include an orange Fireflies effect under `examples/.codegraphy/particles/`.

### Patch Changes

- [#267](https://github.com/joesobo/CodeGraphyV4/pull/267) [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136) Thanks [@joesobo](https://github.com/joesobo)! - Dispose webview plugin work immediately when a plugin is disabled or its webview assets are reset.

  Webview plugin `activate(api)` functions can now return a cleanup function or `Disposable`. CodeGraphy calls that cleanup during plugin disable/reset so plugin-owned UI can stop timers, animation loops, message subscriptions, and injected DOM without waiting for a webview reload.

  The Particles plugin now uses that cleanup path to stop active background effects, clear its Theme controls, unsubscribe from plugin data updates, and remove its injected styles as soon as the plugin is disabled.

- Updated dependencies [[`d2b9db1`](https://github.com/joesobo/CodeGraphyV4/commit/d2b9db14f8d2cc805d673152437f6f83aec9f472), [`6a82b80`](https://github.com/joesobo/CodeGraphyV4/commit/6a82b80d28a1cba4ab9fdcd628c67e3a69de0096), [`e8ceee7`](https://github.com/joesobo/CodeGraphyV4/commit/e8ceee73f753dd2626f2f86c844a666589e1c68b), [`5bf4d88`](https://github.com/joesobo/CodeGraphyV4/commit/5bf4d886a06b861a4002b128951cb6627937d136), [`d0ec1d8`](https://github.com/joesobo/CodeGraphyV4/commit/d0ec1d8a30b9350775cec75e51ee119f0bc2408f)]:
  - @codegraphy-dev/plugin-api@5.1.0

## 0.1.0

- Add graph background particle effect presets for the CodeGraphy Graph Stage.
