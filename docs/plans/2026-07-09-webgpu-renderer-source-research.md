# WebGPU Graph Renderer Source Research

Status: source-backed research for architecture decisions, not an implementation plan.

## Short Read

Replacing `react-force-graph-2d` with WebGPU is plausible, but it is not a small renderer swap. CodeGraphy currently depends on `react-force-graph-2d` for four things at once: Canvas drawing, D3-style force simulation, viewport transforms, and pointer interaction. A WebGPU replacement should become a CodeGraphy-owned graph renderer module behind a small interface, with React still owning surrounding UI.

The best path is staged:

1. Introduce a renderer interface and keep the current `react-force-graph-2d` implementation behind it.
2. Build a WebGPU 2D renderer that consumes CodeGraphy graph buffers and uses CPU or worker layout first.
3. Add WebGPU compute layout as an experimental fast path once drawing, picking, labels, drag, fit, and plugin rendering descriptors are stable.

## Current CodeGraphy Surface To Replace

Current dependency: `packages/extension/package.json` uses `react-force-graph-2d`, `react-force-graph-3d`, `d3-force`, and `graphology`.

Relevant local seams:

- `packages/extension/src/webview/components/graph/rendering/surface/view/twoDimensional.tsx`
- `packages/extension/src/webview/components/graph/rendering/surface/sharedProps.ts`
- `packages/extension/src/webview/components/graph/rendering/useGraphCallbacks.ts`
- `packages/extension/src/webview/components/graph/runtime/physics/pluginForces.ts`
- `packages/plugin-api/src/graphView.ts`
- `packages/plugin-api/src/webview.ts`

Feature surface currently supplied by `react-force-graph-2d`:

- Graph data input and incremental updates through `graphData`.
- Node/link drawing through per-frame Canvas callbacks: `nodeCanvasObject`, `linkCanvasObject`, plus custom pointer hit areas.
- Direction indicators: arrows, particles, particle size, speed, color, and curved links.
- View control: `zoom`, `centerAt`, `zoomToFit`, `screen2GraphCoords`, `graph2ScreenCoords`.
- Event model: node/link/background click, right-click, hover, drag, drag end, zoom events.
- Simulation control: `d3AlphaDecay`, `d3VelocityDecay`, warmup/cooldown ticks, pause/resume animation, `d3Force`, and `d3ReheatSimulation`.
- Plugin force adapters that currently inject D3-compatible forces through `d3Force`.
- Plugin/webview rendering hooks that currently expose raw `CanvasRenderingContext2D`.

Source: `react-force-graph` README documents Canvas/WebGL rendering, D3 physics, zoom/pan, dragging, node/link interactions, Canvas draw callbacks, directional particles/arrows, render hooks, viewport methods, D3 force access, and pointer controls:
https://github.com/vasturiano/react-force-graph

Source: the underlying `force-graph` package describes the 2D version as HTML5 Canvas rendering with `d3-force`, plus zoom/pan, dragging, hover/click interactions, and large graph examples:
https://github.com/vasturiano/force-graph

## WebGPU Support And VS Code Webview Constraints

WebGPU is a real fit for this problem because it supports both rendering and GPU compute. The W3C spec describes WebGPU as exposing GPU hardware to the web, mapping to modern native GPU APIs, and providing `GPUDevice`, `GPUQueue`, buffers, textures, render pipelines, and compute pipelines:
https://www.w3.org/TR/webgpu/

Important constraints:

- WebGPU access starts at `navigator.gpu`, then `requestAdapter()`, then `requestDevice()`.
- The WebGPU spec exposes `navigator.gpu` in both `Window` and `WorkerGlobalScope` contexts, gated by `SecureContext`.
- Chrome shipped WebGPU by default in Chrome 113 on ChromeOS, macOS, and Windows; VS Code webviews ride on Electron/Chromium, so CodeGraphy should runtime-probe rather than hardcode assumptions.
- Electron major releases track Chromium releases, so VS Code support will drift with the VS Code/Electron version.
- GPU adapters/devices can be absent, denied, lost, or limited. A production renderer needs fallback and device-loss recovery.

Sources:

- W3C WebGPU spec: https://www.w3.org/TR/webgpu/
- Chrome WebGPU release: https://developer.chrome.com/blog/webgpu-release
- Electron release cadence: https://www.electronjs.org/docs/latest/tutorial/electron-timelines

VS Code webview constraints matter as much as browser support:

- A webview is an iframe-like surface controlled by the extension and communicates by message passing.
- Webviews are resource-heavy relative to native VS Code UI.
- JavaScript is disabled by default and must be enabled with `enableScripts: true`.
- Webviews should use restrictive `localResourceRoots` and a Content Security Policy.
- Web workers are supported, but VS Code says workers can only be loaded through `data:` or `blob:` URIs and cannot use dynamic `importScripts` or `import(...)`; worker code should be bundled into a single file.
- Webview state is destroyed when moved to the background unless state is persisted or `retainContextWhenHidden` is used.

Source: VS Code Webview API:
https://code.visualstudio.com/api/extension-guides/webview

CodeGraphy's current webview CSP allows local scripts/styles and images but does not currently declare a worker source. If the renderer uses a worker for layout or WebGPU off-main-thread work, the webview HTML/CSP and bundling path need to be part of the renderer design.

## Force Layout Source Facts

`react-force-graph-2d` depends on the D3-style model: a simulation mutates node positions and velocities over ticks, then rendering reads those positions.

D3 facts relevant to replacement:

- `d3-force` uses a velocity Verlet numerical integrator.
- The simulation mutates node `x`, `y`, `vx`, and `vy` values.
- It can run automatically on a timer or manually through `simulation.tick`.
- D3 recommends computing static layouts for large graphs in a web worker to avoid freezing UI.
- The many-body force uses a quadtree and Barnes-Hut approximation, reducing repulsion from naive `O(n^2)` toward `O(n log n)`.

Sources:

- D3 force overview: https://d3js.org/d3-force
- D3 force simulation: https://d3js.org/d3-force/simulation
- D3 many-body force: https://d3js.org/d3-force/many-body

Architecture implication: a WebGPU renderer should not try to preserve raw `d3Force` as the long-term plugin interface. It should expose CodeGraphy physics concepts: repel force, link force, link distance, center force, damping, collision radius, pinning, and optional plugin-owned layout effects.

## GPU Graph Precedents

No source found looks like a mature drop-in WebGPU replacement for `react-force-graph-2d` with CodeGraphy's exact surface. The useful precedents point toward a custom renderer.

### Cosmograph / cosmos.gl

`cosmos.gl` is the strongest browser precedent for the performance dream, but it is WebGL, not WebGPU. Its README says computation and drawing happen on the GPU in fragment and vertex shaders and targets real-time simulation of hundreds of thousands of points and links. Cosmograph docs say `cosmos.gl` uses GPU parallel processing to calculate force-directed layouts for hundreds of thousands or millions of nodes in seconds.

Use it as a design reference and benchmark target, not as a direct WebGPU answer.

Sources:

- cosmos.gl: https://github.com/cosmosgl/graph
- Cosmograph concept docs: https://cosmograph.app/docs-general/concept/

### Sigma.js + Graphology

Sigma.js is a good reference for architecture, not for dynamic force simulation. It separates graph data/algorithms into Graphology and rendering/interactions into Sigma. Sigma renders with WebGL and says that enables larger graphs than Canvas or SVG, with the tradeoff that custom rendering becomes harder.

Graphology's ForceAtlas2 package provides synchronous and worker layout modes, and can use Barnes-Hut optimization. This is useful as a CPU/worker fallback or alternate layout mode, not as the high-end WebGPU layout.

Sources:

- Sigma.js: https://www.sigmajs.org/
- Graphology ForceAtlas2: https://graphology.github.io/standard-library/layout-forceatlas2.html

### GraphWaGu

GraphWaGu is the most relevant WebGPU research precedent. The project page describes a WebGPU graph visualization system using parallel rendering and layout with modified Fruchterman-Reingold and Barnes-Hut algorithms implemented in WebGPU compute shaders.

Use it as evidence that WebGPU compute layout is viable, but treat it as research guidance rather than a production dependency.

Source:

- GraphWaGu project page: https://www.willusher.io/publications/graphwagu/

### GraphGPU

GraphGPU is a newer WebGPU graph visualization library. Its README claims WebGPU-native rendering for nodes, edges, selection halos, labels, CPU or GPU compute force layout, Barnes-Hut CPU repulsion, animated mode, pan/zoom/drag/select/hover, and Canvas2D label overlay.

This is worth a prototype spike, but it should be treated as a candidate to evaluate, not assumed as the renderer foundation.

Source:

- GraphGPU: https://github.com/drkameleon/GraphGPU

## Obsidian Graph View Inspiration

Official Obsidian help frames Graph View around four control groups:

- Filters: search files, tags, attachments, existing files, orphans.
- Groups: search-defined groups with colors.
- Display: arrows, text fade threshold, node size, link thickness, animate time-lapse.
- Forces: center force, repel force, link force, link distance.

Local Graph adds depth around the active note.

Source:

- Obsidian Graph View help: https://obsidian.md/help/plugins/graph

Architecture implication: Obsidian's graph feels useful because controls are immediate and graph-native. CodeGraphy should keep the renderer interactive while filters/scope/query updates stream in, rather than treating graph layout as a static export step.

## Proposed Renderer Module Shape

The replacement should be a deep module with a small interface:

```ts
interface GraphRenderer {
  mount(canvas: HTMLCanvasElement, options: RendererOptions): Promise<void>;
  setGraph(update: GraphSnapshot | GraphDiff): void;
  setStyles(styles: GraphRenderStyles): void;
  setPhysics(settings: GraphPhysicsSettings): void;
  setInteractionState(state: GraphInteractionState): void;
  start(): void;
  stop(): void;
  reheat(): void;
  fitTo(nodes?: readonly string[]): void;
  centerOn(nodeId: string): void;
  screenToGraph(point: Point2D): Point2D;
  graphToScreen(point: Point2D): Point2D;
  hitTest(point: Point2D): GraphHit | null;
  dispose(): void;
}
```

The implementation should be data-oriented:

- Node buffers: id-to-index map in JS; GPU buffers for position, velocity, size, color, type/style index, flags.
- Edge buffers: source/target indexes, edge kind/style index, weight, curvature/direction flags.
- Dynamic buffers: selected, hovered, pinned, hidden, search result, plugin decorations.
- Render passes: edges, arrows, particles, nodes, halos, maybe labels.
- Compute passes later: link springs, center gravity, damping, repulsion approximation, collision approximation.

## Recommended Architecture Direction

Start with `WebGpuGraphRenderer` where GPU owns drawing and CPU/worker owns layout. This gives immediate rendering wins without forcing the hardest compute problem first.

Then add `WebGpuForceLayout` as an optional layout adapter:

- Pass 1: link springs over edges.
- Pass 2: center/gravity/damping over nodes.
- Pass 3: repulsion approximation. Do not begin with all-pairs `O(n^2)`. Use grid/tile approximation first, then Barnes-Hut or another hierarchy if quality demands it.
- Pass 4: integration and pin/drag constraints.

Keep a `CanvasForceGraphRenderer` or current `react-force-graph-2d` adapter as fallback until WebGPU is proven across VS Code/Electron, remote/VM contexts, and weaker hardware.

## Plugin Impact

Current plugins can register raw Canvas node renderers and overlays. A WebGPU renderer should not expose raw GPU pipelines as the default plugin interface.

Prefer React/webview slot contributions for TS visual plugins:

- Plugin windows, panels, toolbar items, and settings live in React/webview slots.
- Transparent background or foreground effects can mount into named DOM slots around the graph.
- Particles are the model: a TS bundle injects an animated transparent background behind the graph without touching node/edge rendering.
- Graph facts, filters, queries, and styling changes flow through the core plugin system and return to the webview as graph projection data.
- Optional declarative graph styling may be added later, but raw renderer interaction should stay private.

This keeps the extension unaware of plugin handling while still letting the core/plugin system describe renderer contributions to the webview.

## Risks And Decisions

- WebGPU availability must be runtime-probed in the VS Code webview with fallback.
- Worker-based layout is attractive, but VS Code webview worker loading requires blob/data bundling and likely CSP changes.
- Labels are expensive at giant scale. Use Obsidian-like text fade threshold, label culling, and possibly a Canvas2D or SDF overlay instead of full labels for every node.
- Picking can be CPU spatial-index based or GPU color-picking based. CPU spatial index is likely simpler and avoids GPU readback stalls.
- Plugin compatibility needs a migration story from raw Canvas callbacks to declarative render descriptors.
- 3D mode should probably remain separate or legacy while the WebGPU effort focuses on the 2D graph.

## Bottom Line

The right track is not "replace React with WebGPU." It is:

```text
React UI shell
  -> CodeGraphy GraphRenderer interface
    -> current react-force-graph adapter
    -> WebGPU 2D renderer
      -> CPU/worker layout first
      -> WebGPU compute layout later
```

This matches the performance goal: giant graphs should keep drawing, panning, zooming, dragging, filtering, and force motion fluidly. The hard part is layout and interaction parity, not just drawing circles faster.
