# `@codegraphy-dev/graph-renderer`

A browser graph engine for large, interactive force-directed graphs. It combines:

- WebGPU rendering for nodes, links, curves, self-links, and directional arrows.
- A fast deterministic WebAssembly force simulation with Barnes–Hut charge, links,
  centering, collision, pinning, and hidden-node support.
- Typed-array data paths that keep graph indexes stable across physics, rendering,
  picking, and application state.

The package owns graph rendering and graph physics only. Your application owns its
graph model, labels, controls, interactions, picking policy, settings, persistence,
tooltips, and UI. That boundary keeps the engine usable outside CodeGraphy.

## Install

```bash
pnpm add @codegraphy-dev/graph-renderer
```

The package is an ES module and requires a browser with WebAssembly and WebGPU.

## Quick start

Prepare the bundled physics module once, create a layout from indexed graph data,
then create a renderer for a canvas.

```ts
import {
  createGraphLayoutEngine,
  prepareGraphPhysics,
  WebGpuGraphRenderer,
  type GraphRendererLink,
  type GraphRendererNode,
} from '@codegraphy-dev/graph-renderer';

await prepareGraphPhysics();

const nodes: GraphRendererNode[] = [
  { id: 'a' },
  { id: 'b' },
];
const links: GraphRendererLink[] = [
  { source: nodes[0], target: nodes[1] },
];

const layout = createGraphLayoutEngine({
  nodeIds: nodes.map(node => node.id),
  radii: Float32Array.of(12, 8),
  chargeStrengthMultipliers: Float32Array.of(1.5, 1),
  edgeSources: Uint32Array.of(0),
  edgeTargets: Uint32Array.of(1),
});

const renderer = await WebGpuGraphRenderer.create(canvas, {
  onDeviceLost: message => console.error(`WebGPU device lost: ${message}`),
  onFrameComplete: () => requestAnimationFrame(draw),
});

if (!renderer) {
  throw new Error('WebGPU is unavailable');
}

let positionVersion = 0;
let styleVersion = 0;

function draw() {
  if (!renderer.canRender()) return;
  const tick = layout.tick();
  if (tick.steps > 0) positionVersion += 1;

  renderer.render({
    backgroundColor: '#111827',
    camera: { centerX: 0, centerY: 0, zoom: 1 },
    cssHeight: canvas.clientHeight,
    cssWidth: canvas.clientWidth,
    devicePixelRatio: window.devicePixelRatio,
    directionMode: 'arrows',
    edgeSources: layout.edgeSources,
    edgeTargets: layout.edgeTargets,
    getArrowColor: () => '#94a3b8',
    getLinkColor: () => '#475569',
    getLinkOpacity: () => 0.8,
    getLinkWidth: () => 1,
    getNodeStyle: () => ({
      borderColor: '#e2e8f0',
      borderWidth: 1,
      cornerRadius: 0,
      fillColor: '#2563eb',
      fillOpacity: 1,
      height: 16,
      opacity: 1,
      shape: 'circle',
      width: 16,
    }),
    hoveredLink: null,
    hoveredNodeIndex: -1,
    hoveredNodeScale: 1,
    links,
    nodes,
    nodeX: layout.x,
    nodeY: layout.y,
    positionVersion,
    styleVersion,
  });
}

requestAnimationFrame(draw);
```

Call `renderer.dispose()` when the canvas is removed. A disposed renderer cannot
be reused.

## Data model and index contract

`nodeIds`, `radii`, flags, positions, and charge multipliers use the same node
index. `edgeSources[n]` and `edgeTargets[n]` refer to node indexes, and the link at
`links[n]` describes that same edge. Keep those arrays aligned; node indexes are
intentionally stable and should not be reordered to change paint order.

The renderer uses `positionVersion` and `styleVersion` as cache keys. Increment
only the version whose data changed:

- Increment `positionVersion` after physics or application code changes positions.
- Increment `styleVersion` after styles, sizes, or style accessors change.
- Replace the node or link array when its membership/order changes.

Nodes are painted from smallest to largest, with the hovered node painted last.
The package exposes `graphNodeDrawnArea`, `resolveGraphLinkGeometry`, and
`pointOnGraphLink` so application picking can follow the same visual rules.

## Physics

`createGraphLayoutEngine(input, config?)` returns a deterministic simulation. Its
main controls are:

- `tick()` — advance one fixed step.
- `setConfig(partial)` — update force settings and reheat when needed.
- `setGraph(input)` — atomically replace indexed graph storage.
- `setNodePosition(index, x, y)` — move a node immediately.
- `pin(index)` / `release(index)` — control fixed nodes.
- `setAlphaTarget(alpha)` / `reheat(alpha?)` — control simulation energy.
- `pause()` / `resume()` — stop or resume stepping.

Node radius is physically meaningful: collision separation uses the supplied
radii and radius-squared correction weighting, so smaller nodes move around larger
ones. `chargeStrengthMultipliers` scales each node's repulsion independently. A
multiplier of `1` keeps the configured default charge, `0` disables that node's
charge, and values above `1` give it more influence.

Invalid buffers, non-finite kinematics, duplicate node IDs, and missing edge
endpoints are rejected before replacing the active graph.

## Rendering and browser support

`WebGpuGraphRenderer.create()` first requests a high-performance adapter and then
allows the browser's fallback WebGPU adapter. It returns `undefined` when WebGPU,
an adapter, or a WebGPU canvas context is unavailable.

There is intentionally no Canvas 2D or WebGL fallback in this package. A consuming
application can show an unsupported-browser state or choose its own fallback. The
renderer reports unexpected device loss through `onDeviceLost`; create a new
renderer to recover. Frame submission is bounded to avoid an unbounded GPU queue,
so check `canRender()` before calling `render()`.

## Public API

| API | Purpose |
| --- | --- |
| `prepareGraphPhysics()` | Compile and install the bundled WebAssembly module. |
| `createGraphLayoutEngine()` | Create the deterministic force simulation. |
| `WebGpuGraphRenderer` | Create, submit frames to, and dispose the WebGPU renderer. |
| `GraphLayout*` types | Indexed physics input, configuration, state, and results. |
| `GraphRenderer*` types | Renderer nodes, links, styles, cameras, and frames. |
| `GraphNodeFlag` | Mark nodes as pinned or hidden. |
| Geometry/visibility helpers | Keep application picking and detail UI aligned with rendering. |

The supported consumer entry point is the package root:

```ts
import { createGraphLayoutEngine, WebGpuGraphRenderer } from '@codegraphy-dev/graph-renderer';
```

Internal WebGPU buffers, shaders, WASM storage, and test hooks are not public API.

## Development

```bash
pnpm --filter @codegraphy-dev/graph-renderer build
pnpm --filter @codegraphy-dev/graph-renderer test
pnpm --filter @codegraphy-dev/graph-renderer typecheck
pnpm --filter @codegraphy-dev/graph-renderer lint
```

`build` compiles the AssemblyScript physics engine, emits the bundled WASM under
`dist/generated/physics.wasm`, and writes the JavaScript and declaration artifacts
under `dist/`.

## License

MIT
