---
"@codegraphy-dev/extension": minor
"@codegraphy-dev/graph-renderer": minor
---

CodeGraphy now renders the Relationship Graph with its own WebGPU renderer and deterministic WebAssembly force-layout engine instead of `react-force-graph` and `d3-force`. Users get one maintained rendering path with size-aware collisions, stable node stacking, directional edges, device-loss recovery, and the remaining supported 2D graph interactions and settings. The accompanying changesets describe the intentionally removed 3D, Timeline, DAG-layout, Churn-sizing, and Uniform-sizing controls.

Node bodies and the always-on-top Canvas decoration layer now use the same ascending-size order, stable graph-index tie-break, hover-last order, and hover scale. Labels, images, badges, and plugin Canvas drawings remain a presentation layer above all WebGPU node bodies so labels stay readable; their relative node order matches the body order, but decoration pixels are intentionally not interleaved between WebGPU bodies.

The Graph View now requires WebGPU and WebAssembly support. When VS Code or the host GPU cannot create a WebGPU device, CodeGraphy shows an unsupported-renderer state rather than falling back to the previous Canvas or Three.js renderers.

A new public `@codegraphy-dev/graph-renderer` package exposes the renderer contracts, WebGPU renderer, typed-array physics engine, and WASM preparation entry point for browser applications. Package consumers must call `prepareGraphPhysics()` before creating a graph layout and must ship the package's generated WASM asset alongside the JavaScript bundle. Renderer consumers are responsible for their canvas, scheduling, camera, interactions, and device-loss UI.

Physics consumers can install host forces through `tick({ beforeIntegration, afterIntegration })`. Owned forces accumulate first, host forces run before integration, and optional finalization runs after collision correction for fixed-coordinate constraints. The package rejects coordinates, velocities, radii, charge multipliers, collision scales, and force settings outside its documented safe numerical domains instead of silently clamping or resetting nodes. Plugin `fx` and `fy` constraints retain per-axis behavior and do not release user or drag pins when a plugin clears them.

Plugin node and edge colors keep browser CSS compatibility after the WebGPU move. Named colors, HSL, percentage RGB, `currentColor`, and resolvable custom properties are computed in the active Graph View theme before upload; invalid or missing variables fall back to the normal graph color instead of turning black. Plugin and CSS-snippet stylesheet toggles refresh cached GPU colors. Direct `@codegraphy-dev/graph-renderer` consumers must provide concrete hexadecimal, numeric RGB, `color(srgb ...)`, or transparent frame colors.
