import { vi } from 'vitest';
import type { OwnedGraph2dControls } from '../../../../src/webview/components/graph/rendering/surface/owned2d/view/surface/contracts';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import type { GraphInteractionHandlersDependencies } from '../../../../src/webview/components/graph/interactionRuntime/handlers';

export function createRef<T>(current: T): { current: T } {
  return { current };
}

export function createDependencies(
  overrides: Partial<GraphInteractionHandlersDependencies> = {},
): GraphInteractionHandlersDependencies {
  const graphData: IGraphData = {
    nodes: [
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', x: 0, y: 0 },
      { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', x: 100, y: 0 },
      { id: 'src/other.ts', label: 'other.ts', color: '#93C5FD', x: 0, y: 100 },
    ],
    edges: [
      { id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] },
      { id: 'src/other.ts->src/app.ts', from: 'src/other.ts', to: 'src/app.ts' , kind: 'import', sources: [] },
    ],
  };
  const container = document.createElement('div');
  const setSelectedNodes = vi.fn();
  const setContextSelection = vi.fn();
  const fg2d = {
    centerAt: vi.fn(),
    reheatSimulation: vi.fn(),
    graph2ScreenCoords: vi.fn((x: number, y: number) => ({ x, y })),
    resumeAnimation: vi.fn(),
    screen2GraphCoords: vi.fn((x: number, y: number) => ({ x, y })),
    zoom: vi.fn(() => 1),
    zoomToFit: vi.fn(),
  } as unknown as OwnedGraph2dControls;

  return {
    containerRef: createRef(container),
    dataRef: createRef(graphData),
    depthMode: false,
    fg2dRef: createRef(fg2d),
    fileInfoCacheRef: createRef(new Map()),
    graphCursorRef: createRef<'default' | 'pointer'>('default'),
    graphDataRef: createRef({
      nodes: graphData.nodes as FGNode[],
      links: graphData.edges.map((edge) => ({
        ...edge,
        bidirectional: false,
        source: edge.from,
        target: edge.to,
      }) as unknown as FGLink),
    }),
    highlightedNeighborsRef: createRef(new Set<string>()),
    highlightedNodeRef: createRef<string | null>(null),
    isMacPlatform: false,
    lastClickRef: createRef<{ nodeId: string; time: number } | null>(null),
    lastGraphContextEventRef: createRef(0),
    selectedNodesSetRef: createRef(new Set<string>()),
    setContextSelection,
    setSelectedNodes,
    ...overrides,
  };
}
