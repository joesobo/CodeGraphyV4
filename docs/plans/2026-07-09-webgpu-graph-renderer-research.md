# WebGPU Graph Renderer Research

## Status

Exploratory architecture research. This is not an implementation plan yet.

The goal is to understand what it would mean to replace CodeGraphy's current
`react-force-graph` graph surface with a custom 2D WebGPU renderer that can keep
large graphs fast, dynamic, and force-driven.

## Current Renderer

CodeGraphy currently depends on:

- `react-force-graph-2d`
- `react-force-graph-3d`
- `d3-force`

Local usage is concentrated around the Graph View surface:

- `packages/extension/src/webview/components/graph/rendering/surface/view/twoDimensional.tsx`
- `packages/extension/src/webview/components/graph/rendering/surface/view/threeDimensional.tsx`
- `packages/extension/src/webview/components/graph/rendering/useGraphCallbacks.ts`
- `packages/extension/src/webview/components/graph/runtime/physics/`
- `packages/extension/src/webview/components/graph/runtime/physics/pluginForces.ts`

`react-force-graph` is doing more than drawing. It bundles several jobs:

- force simulation;
- canvas/WebGL rendering;
- zoom and coordinate transforms;
- node/link pointer picking;
- drag handling;
- hover/click/right-click callbacks;
- imperative graph controls such as `zoom`, `centerAt`, `zoomToFit`,
  `screen2GraphCoords`, `graph2ScreenCoords`, `d3Force`, `d3Alpha`, and
  `d3ReheatSimulation`;
- optional DAG layout behavior;
- directional arrows and particles;
- custom 2D canvas node/link drawing.

That means WebGPU is not a simple package swap. It is a renderer-interface
replacement.

Sources:

- `packages/extension/package.json`
- `packages/extension/src/webview/components/graph/rendering/surface/view/twoDimensional.tsx`
- `packages/extension/src/webview/components/graph/rendering/surface/sharedProps.ts`
- `packages/extension/src/webview/components/graph/runtime/physics/pluginForces.ts`
- [react-force-graph README](https://github.com/vasturiano/react-force-graph)

## What React Force Graph Gives Us Today

The package exports React components for 2D, 3D, VR, and AR force-directed
graphs. Its README describes the 2D path as HTML Canvas rendering and the 3D
path as Three.js/WebGL, with `d3-force-3d` as the underlying physics engine.

CodeGraphy currently uses these capabilities:

- `graphData` with `nodes` and `links`;
- node id mapping through `nodeId`;
- force settings through `d3VelocityDecay`, `d3AlphaDecay`, `d3Force`, and
  `d3ReheatSimulation`;
- cooldown and warmup ticks;
- DAG mode and DAG level distance;
- custom node drawing with `nodeCanvasObject`;
- custom link drawing with `linkCanvasObject`;
- hidden pointer-paint canvas behavior through `nodePointerAreaPaint`;
- directional arrows;
- moving directional particles;
- link colors, widths, curvature, and particle color;
- node click, node hover, node drag, node right-click;
- link click and link right-click;
- background click and right-click;
- `screen2GraphCoords` and `graph2ScreenCoords`;
- `centerAt`, `zoom`, and `zoomToFit`.

The biggest hidden dependency is not rendering. It is the force-graph runtime
object that callers use as the Graph View control surface.

Source:

- [react-force-graph README](https://github.com/vasturiano/react-force-graph)

## What WebGPU Changes

WebGPU gives a webview/browser surface lower-level access to modern GPU
graphics and compute. MDN describes it as a successor to WebGL with better
compatibility with modern GPUs, support for general-purpose GPU computation,
and faster operations.

Chrome's WebGPU overview calls out reduced JavaScript workload and access to
advanced GPU capabilities. It also notes WebGPU is available across Chrome,
Firefox, and Safari implementations, though exact support depends on the
runtime and platform.

For CodeGraphy, this points to two separate opportunities:

```text
WebGPU rendering
  -> draw many nodes and edges with instancing and GPU buffers
  -> reduce canvas draw-call pressure
  -> avoid per-frame React/object churn

WebGPU compute
  -> maybe run force/layout iterations on GPU
  -> maybe keep positions/velocities in GPU buffers
  -> hard but powerful for giant dynamic graphs
```

Sources:

- [MDN WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [Chrome WebGPU overview](https://developer.chrome.com/docs/web-platform/webgpu/overview)
- [Navigator.gpu MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/gpu)
- [WorkerNavigator.gpu MDN](https://developer.mozilla.org/en-US/docs/Web/API/WorkerNavigator/gpu)

## VS Code Webview Constraints

The renderer runs inside a VS Code webview, so it must obey webview lifecycle and
security rules:

- WebGPU needs feature detection through `navigator.gpu` and adapter/device
  creation.
- WebGPU may be unavailable because of runtime, OS, driver, blocklist, hardware
  acceleration settings, or secure-context constraints.
- VS Code webviews should use strict CSP and minimum capabilities.
- Webview content can be destroyed when hidden unless state is persisted or the
  panel uses heavier retention behavior.
- Web workers in VS Code webviews have bundling/resource constraints.

Architecture implication: CodeGraphy should keep a fallback path. The fallback
could be the current Canvas renderer during migration or a simpler Canvas2D
renderer later.

Sources:

- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Chrome WebGPU troubleshooting](https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips)
- [Navigator.gpu MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/gpu)

## Obsidian Inspiration

Obsidian's Graph View is useful inspiration because it treats the graph as a
navigation and filtering surface, not only a visual toy.

Official Graph View features include:

- global graph of vault relationships;
- local graph centered on the active note;
- hover to highlight connections;
- click to open a note;
- right-click context menu;
- zoom and pan by mouse or keyboard;
- filters/search;
- tag, attachment, existing-file, and orphan toggles;
- groups with colors;
- display controls for arrows, text fade threshold, node size, and link
  thickness;
- force controls for center force, repel force, link force, and link distance;
- time-lapse animation;
- local graph depth.

CodeGraphy equivalents worth thinking about:

- global workspace graph;
- local graph around current file/symbol;
- graph depth around a selected node;
- graph scope filters;
- groups by language, plugin, package, folder, or symbol kind;
- search/query-backed visual filters;
- zoom-dependent labels;
- force controls that feel immediate;
- time-travel or timeline graph replay from git/history;
- hover/click/right-click as navigation, not decoration.

Source:

- [Obsidian Graph View help](https://obsidian.md/help/plugins/graph)

## Similar Renderer And Layout Projects

### Sigma.js

Sigma.js is a WebGL graph renderer. Its docs say WebGL lets it draw larger
graphs faster than Canvas or SVG, while making custom rendering harder.

CodeGraphy lesson:

- GPU rendering is a good direction for scale.
- Custom rendering and plugin extensibility get harder, so the plugin rendering
  interface should be declarative.

Source:

- [Sigma.js](https://www.sigmajs.org/)

### Cosmograph / cosmos.gl

cosmos.gl is a GPU-accelerated WebGL force-graph engine. Its README says
computation and drawing happen on the GPU and that it targets real-time
simulation of hundreds of thousands of points and links on modern hardware.
Cosmograph's docs frame the central challenge exactly like CodeGraphy's: both
layout computation and rendering become hard at large scale.

CodeGraphy lesson:

- Use numeric ids and typed arrays instead of object-heavy per-frame data.
- Keep simulation state close to GPU buffers.
- Separate simulation control from rendering control.
- Consider link blending and dense-edge rendering modes for performance.

Sources:

- [cosmos.gl GitHub](https://github.com/cosmosgl/graph)
- [Cosmograph concept docs](https://cosmograph.app/docs-general/concept/)

### GraphWaGu

GraphWaGu is an academic WebGPU graph visualization system. Its abstract says it
uses WebGPU compute shaders for modified Fruchterman-Reingold and Barnes-Hut
layout plus fast parallel rendering.

CodeGraphy lesson:

- WebGPU layout is possible and directly relevant.
- It is also a serious renderer/layout project, not a small React migration.

Source:

- [GraphWaGu publication page](https://www.willusher.io/publications/graphwagu/)

### d3-force And d3-force-webgpu

`d3-force` uses a velocity Verlet integrator and lets callers render ticks in a
separate graphics system. Its many-body force uses a quadtree and Barnes-Hut
approximation for performance.

`d3-force-webgpu` is a small experimental project that tries to keep a
`d3-force`-like interface while moving force computation into WebGPU compute
shaders. Its README advertises a CPU fallback and API compatibility, but the
project looks young, so it is better as a research reference than an immediate
dependency.

CodeGraphy lesson:

- Keeping a `d3-force`-like force interface could make migration easier.
- The real performance win comes when position and velocity buffers avoid
  round-tripping back to JavaScript every frame.

Sources:

- [d3-force docs](https://d3js.org/d3-force)
- [d3 many-body force docs](https://d3js.org/d3-force/many-body)
- [d3-force-webgpu GitHub](https://github.com/jamescarruthers/d3-force-webgpu)

### Graphology ForceAtlas2

Graphology's ForceAtlas2 package supports synchronous layout and a web worker
utility. It is not WebGPU, but it is useful as a CPU/worker layout reference and
as a reminder that graph layout can be independent from graph rendering.

CodeGraphy lesson:

- Layout should be its own module.
- Renderer should not own the only possible simulation algorithm.

Source:

- [Graphology ForceAtlas2](https://graphology.github.io/standard-library/layout-forceatlas2.html)

## Target Interface Shape

The future renderer should be a deep module with a small interface.

It should hide WebGPU pipelines, buffers, picking textures, shader code, resize
handling, and draw scheduling.

The extension/webview should mostly know this:

```text
GraphRenderer
  setGraph(projection)
  applyGraphDiff(diff)
  setAppearance(appearance)
  setViewport(viewport)
  setSelection(selection)
  setHover(hover)
  fitToBounds(options)
  screenToGraph(point)
  graphToScreen(point)
  start()
  stop()
  dispose()
```

The layout side should be separate:

```text
GraphLayout
  setGraph(projection)
  applyGraphDiff(diff)
  setForces(settings)
  pinNode(nodeId, position)
  unpinNode(nodeId)
  reheat()
  tick(frameBudget)
  getPositions()
  dispose()
```

The two can initially live in the same package, but keeping the interface
separate leaves room for these adapters:

- current `react-force-graph` adapter;
- custom Canvas2D adapter;
- WebGPU rendering + CPU d3 layout;
- WebGPU rendering + workerized CPU layout;
- WebGPU rendering + WebGPU compute layout.

## Migration Levels

### Level 1: WebGPU Renderer, Existing CPU Layout

Keep `d3-force` or force-graph-like CPU simulation. Replace the 2D canvas
drawing path with WebGPU.

Pros:

- smaller first step;
- preserves force behavior;
- performance win for draw-heavy graphs;
- easier to compare visually against current renderer.

Cons:

- layout still burns CPU;
- positions still move through JavaScript;
- not enough for truly huge dynamic graphs.

### Level 2: Workerized Layout, WebGPU Renderer

Move layout ticks off the main webview thread. Render with WebGPU on the main
thread or explore WebGPU in a dedicated worker if VS Code webview constraints
allow it.

Pros:

- keeps UI responsive;
- avoids freezing React and pointer handling;
- can still use known CPU algorithms.

Cons:

- worker bundling in VS Code webviews needs care;
- transferring large positions every frame can erase gains unless using compact
  typed arrays and throttled updates.

### Level 3: WebGPU Compute Layout

Positions, velocities, edges, and forces live mostly in GPU buffers. Rendering
and simulation share buffers.

Pros:

- best match for giant dynamic graphs;
- avoids JavaScript per-node simulation loops;
- can keep dense graphs moving.

Cons:

- hardest implementation;
- debugging shader/compute logic is slower;
- plugin force adapters need a new declarative model;
- hit testing and labels need deliberate design.

## What We Need To Support

Rendering:

- nodes with size, shape, color, opacity, selection, hover, muted state;
- links with color, width, opacity, curvature, arrows, direction markers;
- moving particles or equivalent direction animation;
- labels with zoom-based visibility and fade threshold;
- file icons/images or a reduced high-performance substitute;
- collapse indicators and badges;
- highlighted neighbors;
- dense-edge mode for large graphs;
- screenshot/export path.

Layout and physics:

- repel force;
- link force;
- link distance;
- center force;
- collision;
- damping;
- reheating;
- engine stop/stabilization events;
- pinned/fixed node positions;
- node drag updates;
- optional DAG/tree mode or a replacement layout mode;
- plugin-owned forces or a replacement contribution model.

Interaction:

- pan and zoom;
- keyboard zoom/pan;
- click, right-click, hover;
- node drag and drag-end policies;
- marquee/multi-selection;
- context menu coordinates;
- `screenToGraph` and `graphToScreen`;
- fit to graph and focus node;
- accessibility overlay.

Plugin-facing behavior:

- graph toolbar and panel slots stay React/webview;
- world/viewport overlays need a renderer-aware contract;
- TS-only visual plugins like particles can remain webview bundles;
- core/plugin analyzers like Vue or Godot can feed graph facts through core;
- raw renderer access should stay private;
- plugin graph styling should become declarative enough for GPU buffers.

## Full Replacement Parity Spec

What a WebGPU renderer must actually implement for `react-force-graph-2d` to
be removed, grounded in what the codebase uses today (not the library's full
API). Sources: `sharedProps.ts`, `twoDimensional.tsx`, the physics runtime
(`runtime/physics/root/settings/*`, `pluginForces.ts`), and the interaction
runtime (`interactionRuntime/*`, `runtime/use/interaction/*`).

### 1. Physics Engine (the biggest hidden subsystem)

CodeGraphy configures the d3 simulation directly, so the replacement needs a
full d3-force-compatible engine, not "some physics":

- Integration: velocity Verlet with the d3 alpha lifecycle — `alpha`,
  `alphaMin`, `alphaDecay` (currently 0.0228), `velocityDecay` (the damping
  setting, 0.7), and `d3ReheatSimulation` semantics (reset alpha to 1).
- Forces in use (`root/settings/`): charge/many-body (Barnes-Hut quadtree,
  `gravitationalConstant: -250`), link springs (per-link distance 80 /
  strength 0.15), center + centroid gravity (0.1), and collision (iterative,
  radius-aware).
- Pinning: `fx`/`fy` fixed positions — this is how node drag works (fix during
  drag, optionally release on drag end) and how persisted layouts would load.
- Lifecycle: `warmupTicks` (currently 0), `cooldownTicks` (60 interactive / 50
  timeline), and `onEngineStop` — the app listens for stabilization.
- Plugin forces: `pluginForces.ts` installs adapters with
  `initialize(nodes)` / `tick(alpha)` / `dispose()` under namespaced ids. This
  exact contract must survive in the CPU layout; a GPU layout needs a
  declarative replacement before plugin forces can move.

Recommendation: do not rewrite the math initially. Run the actual `d3-force`
package (or a literal port) inside the layout module — main thread first,
worker later — so physics feel is bit-identical while the renderer changes
underneath. Custom/GPU physics is a later, separately validated step.

### 2. Node Rendering

Current drawing is fully custom (`nodeCanvasObjectMode: 'replace'`) via
`rendering/node/*`: body shapes, labels, media/icons, collapse indicators,
pointer areas. WebGPU equivalents:

- Bodies: one instanced draw of quads shaded as SDF circles (and any other
  body shapes as SDF variants); per-instance position, radius (`nodeVal` ->
  radius mapping), fill color, border, and state flags (selected, hovered,
  muted, search hit) driving halo/dim effects in the shader.
- File icons/media (`node/media.ts`): a texture atlas sampled per instance;
  LOD rule to drop icons below a zoom threshold.
- Collapse indicators/badges: a second small instanced layer positioned
  relative to the parent node.
- Labels (`node/label.ts`): the hardest rendering problem. Two viable paths:
  (a) MSDF glyph atlas rendered in-GPU — best scaling, most work; (b) a
  Canvas2D/DOM overlay that draws only the top-N visible labels (hovered,
  selected, largest on screen) with zoom-gated fade, Obsidian-style. Path (b)
  is recommended first: at the committed 100k-node scale, only a tiny fraction
  of labels are legible at once anyway.

### 3. Link Rendering

- Lines: instanced segments expanded to screen-space width in the vertex
  shader; per-instance color, width, opacity.
- Curvature (`linkCurvature`): quadratic bezier evaluated in the vertex shader
  over a small subdivided strip; curvature is per-link data already
  (`link.curvature` for multi-edges/self-loops).
- Directional arrows: instanced triangles placed at `arrowRelPos` along the
  (possibly curved) link, oriented by the curve tangent, shortened by target
  node radius.
- Directional particles: currently the only always-animating feature
  (`autoPauseRedraw` is disabled in particles mode). On GPU this is nearly
  free: particle position = bezier evaluated at a per-link phase advanced by
  time; one instanced draw, no per-particle JS state.
- Link text/dash/custom draws that today go through `linkCanvasObject` need an
  inventory pass — each becomes either per-instance data or a shader feature.

### 4. Viewport And Camera

Replace the library's zoom/pan transform with an owned 2D camera (translate +
scale), providing: `zoom(k, ms)`, `centerAt(x, y, ms)` with tweened
animation, `zoomToFit(ms, padding, filter)`, `getGraphBbox`, min/max zoom
clamps, `screen2GraphCoords`/`graph2ScreenCoords` (trivial matrix math), and
an `onZoom` event stream. Note CodeGraphy already disables the library's pan
(`enablePanInteraction={false}`) and implements its own Ctrl-drag pan
(`runtime/use/interaction/viewportPan/`) — the custom camera actually
simplifies this code.

### 5. Picking And Pointer Model

Replace `nodePointerAreaPaint` (hidden hit-canvas) with a CPU spatial hash or
quadtree rebuilt from positions each tick (cheap for 100k points):

- node hit test: nearest node within radius (+ pointer slop);
- link hit test: point-to-segment/bezier distance with hover precision;
- marquee selection (`interaction/marquee/`): a range query on the same index;
- pointer state machine reproducing the library's semantics: hover
  (enter/leave with null), click vs drag threshold, right-click, background
  click/right-click, drag start/move/end with `fx`/`fy` pinning and reheat.

The same position data feeds the accessibility projector
(`viewport/accessibility.ts` needs `graph2ScreenCoords` + node radii), tooltip
rects, and the debug snapshot protocol (`graph/debug/`), so positions must
remain CPU-readable — one more reason CPU/worker layout comes before GPU
layout.

### 6. Render Loop And Damage Model

Reproduce `autoPauseRedraw`: draw only when the simulation ticked, the camera
moved, interaction state changed, or a continuous animation (particles, tween)
is active. Add a frame budget so simulation ticks and buffer uploads cannot
starve pointer handling. `onRenderFramePost` (used today for overlays like
marquee rectangles) becomes an explicit overlay pass or a DOM/Canvas overlay
layer above the WebGPU canvas.

### 7. DAG Mode

`dagMode`/`dagLevelDistance` are wired through settings today
(td/bu/lr/rl/radial variants in the library). The library implements DAG as
constraint forces on top of the same simulation, so it ports as one more
force. Keep it as a layout-module feature, or explicitly drop it — but decide;
it is user-visible settings surface.

### 8. Explicitly Not Needed

Force-graph API surface CodeGraphy does not use and the replacement should not
build: `nodeAutoColorBy`/`linkAutoColorBy`, `emitParticle`, particle offset /
custom particle draws, `linkLineDash` (dashes, if any, live in custom draw
code), `onLinkHover`, `linkPointerAreaPaint`, `cooldownTime`, `dagNodeFilter`
/ `onDagError`, and all 3D/VR/AR surfaces (3D is being removed).

### 9. Parity Verification

- Physics: identical d3 engine (or port) validated by running old and new
  side-by-side on fixture graphs and diffing settled positions.
- Interaction: the existing acceptance specs plus the debug snapshot protocol
  give a comparison harness; extend snapshots to include camera transform and
  hit-test results.
- Visuals: screenshot-diff fixture graphs at fixed seeds/zoom levels between
  the react-force-graph adapter and the WebGPU renderer.

### Effort Ranking

Hardest first: labels at scale; physics feel parity (drag/reheat/settle);
curved-link arrows and particles; picking semantics parity; DAG mode;
everything else (bodies, lines, camera, halos) is standard instanced
rendering.

## Plugin Implications

The current plugin API includes Canvas-oriented hooks such as node renderers and
overlay renderers. A WebGPU renderer should avoid exposing raw WebGPU state to
plugins early.

The preferred direction is simpler than full renderer extensibility:

```text
Core owns:
  plugin install/enable/disable
  plugin metadata
  graph facts/query behavior
  renderer-facing graph projection data

React/webview shell owns:
  plugin windows
  settings panels
  toolbar slots
  side panels
  DOM overlays
  transparent background/foreground effect slots

WebGPU renderer owns:
  GPU pipeline
  buffer format
  batching strategy
  picking strategy
  level-of-detail behavior
```

TS visual plugins should generally interface with the React layout and DOM slot
system, not with the WebGPU graph internals. Particles are the model example: the
plugin can render a transparent animated background by injecting into a specific
HTML slot behind the graph, while the WebGPU graph continues to own nodes, edges,
picking, and layout.

This means CodeGraphy does not need to support arbitrary plugins mutating graph
interaction or raw graph rendering. Plugins can add their own React UI where the
host exposes slots. If a plugin needs to affect graph facts, filters, styling, or
queries, that should flow through the core plugin system and come back to the
renderer as normal graph projection data.

Future declarative graph styling can still exist, but it should be a narrow core
or projection feature rather than a general "plugin gets the renderer" interface.

## The Extension-Host Hop

The renderer does not receive data from the core directly. Every payload
crosses: core stdio -> extension host (Node) -> `webview.postMessage` ->
webview. Two facts govern this path:

- VS Code webview messaging JSON-serializes by default, which is pathological
  for typed arrays; VS Code added explicit ArrayBuffer transfer support
  ([issue #115807](https://github.com/microsoft/vscode/issues/115807),
  [PR #148429](https://github.com/microsoft/vscode/pull/148429)). The renderer
  payload format must be flat binary buffers passed via the transfer parameter,
  never per-node JSON objects.
- `SharedArrayBuffer` requires cross-origin isolation and should not be assumed
  available inside webviews.

Design rule: the extension host never parses graph payloads. It forwards
binary frames from the core to the webview untouched. In VS Code Remote
scenarios the core runs on the remote host while the webview (and GPU) run on
the client, so the payload also crosses the network — one more reason diffs
and compact binary formats are non-negotiable.

## GPU-Resident Positions Have Consumers

Level 3 (compute layout) keeps positions in GPU buffers, but several features
need positions on the CPU:

- hit testing via spatial index;
- node drag (write user position back into the sim);
- context menu placement, `graphToScreen`, fit-to-bounds;
- persisting layout snapshots to the core cache.

So Level 3 still needs a throttled async readback (`mapAsync` on a staging
buffer, e.g. every N frames), or GPU color-picking plus GPU-computed bounds to
avoid readback for interaction. Budget this as part of Level 3's design, not
as a surprise; naive per-frame synchronous readback would erase the win.

## Performance Budgets And Test Matrix

The plan should commit to numbers before code exists, and measure the current
renderer first so wins are provable:

- Baseline: measure react-force-graph FPS and interaction latency at 1k / 10k
  / 50k nodes on the current stack (the screenshot harness can host this).
- Committed targets: 60fps pan/zoom at 100k nodes / 300k edges; < 16ms
  hit-test; < 100ms full projection swap at 100k nodes; force-control changes
  reflected next frame.
- Platform matrix: macOS (Metal), Windows (D3D12), Linux (Vulkan — Electron
  has a history of `requestAdapter()` returning null on Linux,
  [electron#41763](https://github.com/electron/electron/issues/41763)), plus
  VS Code Remote (client GPU) and a software-rendering/VM case that must hit
  the Canvas fallback cleanly.
- Device loss: suspend/resume and driver-reset recovery is a test case, not an
  afterthought.

## Performance Strategy

For the "giant graphs moving fast" dream, prioritize:

- stable numeric node/link ids;
- struct-of-arrays or typed-array graph projections;
- compact graph diffs from core;
- append/update GPU buffers instead of rebuilding whole JS objects;
- level-of-detail for labels, icons, edge arrows, and particles;
- dense-edge rendering modes;
- zoom-dependent label selection;
- viewport culling where it helps;
- GPU or spatial-index picking;
- animation frame budgeting;
- avoid React state updates per simulation tick;
- keep force settings immediately interactive;
- local graph/depth graph mode for focused exploration;
- optional precomputed/cached layout snapshots in the core cache.

The renderer should be optimized around the normal loop:

```text
core query/projection/diff
  -> typed visible graph payload
  -> layout positions/velocities update
  -> GPU buffers update
  -> renderer draws
  -> interaction returns node/link ids
  -> extension asks core for details/actions
```

## Recommended Direction

The best near-term architecture is:

```text
React UI shell
  -> GraphRenderer interface
      -> current react-force-graph adapter
      -> future WebGPU 2D adapter
  -> GraphLayout interface
      -> current d3/force-graph layout adapter
      -> future worker/GPU layout adapter
```

Do not start with full GPU compute layout. Start with the renderer seam, because
that lets CodeGraphy replace the hot drawing path while preserving current graph
behavior. Then move layout from CPU main-thread to worker or GPU once the
renderer can consume typed position buffers efficiently.

The product direction is to remove `react-force-graph` rather than wrap it
forever. The adapter step is only a migration safety rail while CodeGraphy builds
its own 2D graph engine from the ground up.

Long-term dream:

```text
Rust core computes compact graph projection/diffs
  -> VS Code webview receives typed payload
  -> WebGPU renderer owns high-volume drawing
  -> WebGPU or worker layout keeps graph alive and dynamic
  -> React owns controls, panels, plugin UI slots
```

## Open Questions With Leanings

- 3D mode: decided — remove it. It is a gimmick relative to the 2D graph's
  navigation value, and dropping `react-force-graph-3d`/Three.js removes a
  large dependency, shrinks the webview bundle, and keeps the WebGPU effort
  focused on a single renderer.
- Should layout be d3-compatible at first or should we jump to a new force
  model? Leaning: keep the current d3 simulation verbatim behind the layout
  interface for step 1, so renderer changes can be validated against pixel-
  identical physics. New force models come only after the renderer is trusted.
- How much of DAG mode is essential? Needs usage data; if kept, DAG is a layout
  adapter, which the interface split already accommodates.
- Plugin Canvas renderers: remove raw hooks, keep DOM slots, add declarative
  styling later (per the plugin sections above). A compatibility Canvas overlay
  layered on the WebGPU canvas is a plausible bridge if a real plugin needs it.
- Persistent layout coordinates: SQLite table in the core cache keyed by stable
  node id. Note the hard sub-problem is node identity across renames/moves —
  positions keyed by path evaporate on refactors.
- Target scale: decided — smooth (60fps pan/zoom/drag) at 100k nodes / 300k
  edges; usable (interactive, degraded decoration) at 500k edges. Buffer
  formats, picking, and LOD strategy should be designed against this tier.
- Dense graph mode hiding order: particles first (pure decoration, per-frame
  cost), then icons, then labels (keep zoom-gated labels for hovered/selected
  neighborhoods), then arrows, then low-importance edges by weight.
