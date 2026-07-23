# @codegraphy-dev/graph-renderer

## 0.3.0

### Minor Changes

- [#316](https://github.com/joesobo/CodeGraphyV4/pull/316) [`b0be906`](https://github.com/joesobo/CodeGraphyV4/commit/b0be906f58c265ccb66fb6b54998525429c90acb) Thanks [@joesobo](https://github.com/joesobo)! - Allow rendering interfaces to resolve the packaged physics asset and start
  graph physics from embedded WebAssembly bytes. This lets offline hosts use
  CodeGraphy's force layout without loading a separate WebAssembly file at
  runtime.

## 0.2.0

### Minor Changes

- [#311](https://github.com/joesobo/CodeGraphyV4/pull/311) [`03d9489`](https://github.com/joesobo/CodeGraphyV4/commit/03d948904d85128d9953fd7fb3ac64df4ab7d945) Thanks [@joesobo](https://github.com/joesobo)! - Add an optional Relationship Graph minimap with stable fitted rendering, pointer and keyboard navigation, and a persisted Display setting.

## 0.1.0

### Minor Changes

- [#308](https://github.com/joesobo/CodeGraphyV4/pull/308) [`ae76da4`](https://github.com/joesobo/CodeGraphyV4/commit/ae76da4c7c59436dcaa7e8776c8145e5b057926d) Thanks [@joesobo](https://github.com/joesobo)! - CodeGraphy now renders the Relationship Graph with its own WebGPU renderer and deterministic WebAssembly force-layout engine instead of `react-force-graph` and `d3-force`. Users get one maintained rendering path with size-aware collisions, stable node stacking, directional edges, device-loss recovery, and the remaining supported 2D graph interactions and settings. The accompanying changesets describe the intentionally removed 3D, Timeline, DAG-layout, Churn-sizing, and Uniform-sizing controls.

Node bodies and the top Canvas decoration layer now share ascending-size order, stable graph-index tie-breaks, hover-last order, and hover scale. Labels, images, badges, and plugin Canvas drawings remain above WebGPU Node bodies for legibility. Their relative Node order matches the body order. Decoration pixels do not interleave with WebGPU bodies.

The Graph View now requires WebGPU and WebAssembly support. When VS Code or the host GPU cannot create a WebGPU device, CodeGraphy shows an unsupported-renderer state rather than falling back to the previous Canvas or Three.js renderers.

A new public `@codegraphy-dev/graph-renderer` package exposes renderer contracts, a WebGPU renderer, a typed-array physics engine, and a WebAssembly (WASM) preparation entry point. Consumers must call `prepareGraphPhysics()` before creating a graph layout and ship the generated WASM asset with the JavaScript bundle. They own the canvas, scheduling, camera, interactions, and recovery UI. The renderer tries a software adapter when native device creation fails. It rejects frames that exceed WebGPU buffer limits before changing state and reports runtime GPU errors through `onRendererError`, so hosts can replace a failed renderer.

Physics consumers can install host forces through `tick({ beforeIntegration, afterIntegration })`. Owned forces accumulate first, host forces run before integration, and optional finalization runs after collision correction for fixed-coordinate constraints. The package rejects coordinates, velocities, radii, charge multipliers, and force settings outside its documented safe numerical domains instead of silently clamping or resetting nodes. Collision radii remain fixed in graph space: camera zoom never reheats or permanently spreads a settled layout, while a node pinned during dragging still pushes overlapping neighbors aside. Plugin `fx` and `fy` constraints retain per-axis behavior and do not release user or drag pins when a plugin clears them.

Plugin Node and Edge colors keep browser CSS compatibility after the WebGPU move. Before GPU upload, the active Graph View theme resolves named colors, HSL, percentage RGB, `currentColor`, and custom properties. Invalid or missing variables use the standard graph color. Plugin and CSS Snippet stylesheet toggles refresh cached GPU colors. Direct `@codegraphy-dev/graph-renderer` consumers must provide hexadecimal, numeric RGB, `color(srgb ...)`, or transparent frame colors.
