import {
  createGraphLayoutEngine,
  type WebGpuGraphRenderer as OwnedWebGpuRenderer,
} from '@codegraphy-dev/graph-renderer';
import { vi } from 'vitest';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import type { OwnedGraphFrameRuntime } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import { createOwnedGraphNodeHover } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/interaction/hover/model';
import { createGraphLayoutFixedTimestepClock } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/simulation/timing/clock';
import { createDefaultSurfaceProps } from '../../view/surface/fixture';

export function canvasFixture(): HTMLCanvasElement {
  const context = {
    clearRect: vi.fn(),
    restore: vi.fn(),
    save: vi.fn(),
    scale: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  return {
    getBoundingClientRect: () => ({ height: 400, width: 600 }),
    getContext: () => context,
    height: 0,
    width: 0,
  } as unknown as HTMLCanvasElement;
}

export function runtimeFixture(renderer: OwnedWebGpuRenderer): {
  layout: OwnedGraphLayout;
  node: FGNode;
  runtime: OwnedGraphFrameRuntime;
} {
  const node = {
    baseOpacity: 1,
    borderColor: '#000000',
    borderWidth: 1,
    color: '#93c5fd',
    id: 'a',
    isFavorite: false,
    isPinned: false,
    label: 'a',
    size: 4,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
  } as FGNode;
  const engine = createGraphLayoutEngine({
    nodeIds: [node.id],
    initialX: Float32Array.of(0),
    initialY: Float32Array.of(0),
    radii: Float32Array.of(4),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  });
  const layout: OwnedGraphLayout = {
    engine,
    links: [],
    nodes: [node],
  };
  const props = createDefaultSurfaceProps();
  props.sharedProps.graphData = { links: [], nodes: [node] };
  const runtime: OwnedGraphFrameRuntime = {
    cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
    engineStopNotifiedRef: { current: false },
    gpuRendererRef: { current: renderer },
    hoveredLinkRef: { current: null },
    hoveredNodeRef: { current: null },
    layoutRef: { current: layout },
    minimapProjectionRef: { current: null },
    minimapSurfaceRegisteredRef: { current: false },
    nodeHoverRef: { current: createOwnedGraphNodeHover() },
    onRendererError: vi.fn(),
    pointerSessionRef: { current: null },
    pluginForcesRef: { current: {
      active: () => true,
      dispose: vi.fn(),
      sync: vi.fn(() => false),
      tick: vi.fn(() => {
        node.x = 12;
        node.y = 13;
        node.vx = 2;
        node.vy = 3;
        return true;
      }),
    } },
    positionVersionRef: { current: 0 },
    propsRef: { current: props },
    rendererOperationalRef: { current: true },
    requestFrameRef: { current: vi.fn() },
    simulationClockRef: { current: createGraphLayoutFixedTimestepClock() },
    markPerformanceIdle: vi.fn(),
    recordRenderedFrame: vi.fn(),
    synchronizedPositionVersionRef: { current: -1 },
  };
  return { layout, node, runtime };
}
