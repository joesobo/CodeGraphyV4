# `@codegraphy-dev/graph-renderer`

CodeGraphy's graph rendering engine. It draws graph nodes and links with WebGPU
and runs the built-in deterministic force layout in WebAssembly.

The package owns rendering and physics mechanics only. Consumers remain
responsible for graph data, interaction, UI, settings, persistence, labels,
tooltips, and plugin orchestration.

## Usage

```ts
import {
  createGraphLayoutEngine,
  OwnedWebGpuRenderer,
  prepareGraphPhysics,
} from '@codegraphy-dev/graph-renderer';
```

Call `prepareGraphPhysics()` before creating a layout. Create an
`OwnedWebGpuRenderer` with a canvas, then submit frames using positions from the
layout engine. See the exported TypeScript contracts for frame and layout data.

WebGPU is required for drawing. The renderer first requests a high-performance
GPU adapter and then allows the browser's fallback WebGPU adapter; it does not
provide a Canvas or WebGL graph-rendering fallback. WebAssembly is required for
the built-in layout.

## Development

```bash
pnpm --filter @codegraphy-dev/graph-renderer build
pnpm --filter @codegraphy-dev/graph-renderer test
pnpm --filter @codegraphy-dev/graph-renderer typecheck
```

`build` emits the public JavaScript, declarations, source maps, and physics
WASM under `dist/`.
