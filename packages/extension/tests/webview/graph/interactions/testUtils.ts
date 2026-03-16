import { vi } from 'vitest';
import type {
  ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import type { IGraphData } from '../../../../src/shared/types';
import type { FGLink, FGNode } from '../../../../src/webview/components/graphModel';
import type { GraphInteractionHandlersDependencies } from '../../../../src/webview/components/graph/interactions';

export function createRef<T>(current: T): { current: T } {
  return { current };
}

export function createInteractionDependencies(
  overrides: Partial<GraphInteractionHandlersDependencies> = {},
): GraphInteractionHandlersDependencies {
  const graphData: IGraphData = {
    nodes: [
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD', x: 0, y: 0 },
      { id: 'src/utils.ts', label: 'utils.ts', color: '#67E8F9', x: 100, y: 0 },
      { id: 'src/other.ts', label: 'other.ts', color: '#93C5FD', x: 0, y: 100 },
    ],
    edges: [
      { id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' },
      { id: 'src/other.ts->src/app.ts', from: 'src/other.ts', to: 'src/app.ts' },
    ],
  };
  const container = document.createElement('div');
  const fg2d = {
    centerAt: vi.fn(),
    zoom: vi.fn(() => 1),
    zoomToFit: vi.fn(),
  } as unknown as FG2DMethods<FGNode, FGLink>;
  const fg3d = {
    zoomToFit: vi.fn(),
  } as unknown as FG3DMethods<FGNode, FGLink>;

  return {
    containerRef: createRef(container),
    dataRef: createRef(graphData),
    fg2dRef: createRef(fg2d),
    fg3dRef: createRef(fg3d),
    fileInfoCacheRef: createRef(new Map()),
    graphCursorRef: createRef<'default' | 'pointer'>('default'),
    graphDataRef: createRef({
      nodes: graphData.nodes as FGNode[],
      links: graphData.edges.map((edge) => ({
        ...edge,
        source: edge.from,
        target: edge.to,
      })) as FGLink[],
    }),
    graphMode: '2d',
    highlightedNeighborsRef: createRef(new Set<string>()),
    highlightedNodeRef: createRef<string | null>(null),
    isMacPlatform: false,
    lastClickRef: createRef<{ nodeId: string; time: number } | null>(null),
    lastGraphContextEventRef: createRef(0),
    selectedNodesSetRef: createRef(new Set<string>()),
    setContextSelection: vi.fn(),
    setHighlightVersion: vi.fn(),
    setSelectedNodes: vi.fn(),
    ...overrides,
  };
}
