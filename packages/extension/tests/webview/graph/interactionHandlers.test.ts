import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import type { IGraphData } from '../../../src/shared/types';
import type { FGLink, FGNode } from '../../../src/webview/components/graphModel';
import {
  createGraphInteractionHandlers,
  type GraphInteractionHandlersDependencies,
} from '../../../src/webview/components/graph/interactionHandlers';
import {
  clearSentMessages,
  findMessage,
  getSentMessages,
} from '../../helpers/sentMessages';

function createRef<T>(current: T): { current: T } {
  return { current };
}

function createDependencies(
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
  const setSelectedNodes = vi.fn();
  const setContextSelection = vi.fn();
  const setHighlightVersion = vi.fn();
  const fg2d = {
    centerAt: vi.fn(),
    zoom: vi.fn(() => 1),
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
      links: graphData.edges.map(edge => ({
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
    setContextSelection,
    setHighlightVersion,
    setSelectedNodes,
    ...overrides,
  };
}

describe('graph/interactionHandlers', () => {
  beforeEach(() => {
    clearSentMessages();
    vi.clearAllMocks();
  });

  it('tracks highlighted neighbors and bumps 3d highlight state', () => {
    const dependencies = createDependencies({
      graphMode: '3d',
    });
    const handlers = createGraphInteractionHandlers(dependencies);

    handlers.setHighlight('src/app.ts');

    expect(dependencies.highlightedNodeRef.current).toBe('src/app.ts');
    expect([...dependencies.highlightedNeighborsRef.current]).toEqual([
      'src/utils.ts',
      'src/other.ts',
    ]);
    expect(dependencies.setHighlightVersion).toHaveBeenCalledWith(expect.any(Function));
  });

  it('updates node selection and opens the node context menu', () => {
    const dependencies = createDependencies();
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current, 'dispatchEvent');
    const handlers = createGraphInteractionHandlers(dependencies);
    const event = new MouseEvent('contextmenu', {
      button: 2,
      buttons: 2,
      clientX: 24,
      clientY: 32,
    });

    handlers.openNodeContextMenu('src/app.ts', event);

    expect(dependencies.selectedNodesSetRef.current).toEqual(new Set(['src/app.ts']));
    expect(dependencies.setSelectedNodes).toHaveBeenCalledWith(['src/app.ts']);
    expect(dependencies.setContextSelection).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'node',
        targets: ['src/app.ts'],
      }),
    );
    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dependencies.lastGraphContextEventRef.current).toBeGreaterThan(0);
  });

  it('focuses nodes in 2d and 3d graph modes', () => {
    const twoDimensional = createDependencies({
      graphMode: '2d',
    });
    const twoDimensionalHandlers = createGraphInteractionHandlers(twoDimensional);

    twoDimensionalHandlers.focusNodeById('src/app.ts');

    expect(twoDimensional.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(twoDimensional.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);

    const threeDimensional = createDependencies({
      graphMode: '3d',
    });
    const threeDimensionalHandlers = createGraphInteractionHandlers(threeDimensional);

    threeDimensionalHandlers.focusNodeById('src/app.ts');

    expect(threeDimensional.fg3dRef.current?.zoomToFit).toHaveBeenCalledWith(
      300,
      20,
      expect.any(Function),
    );
  });

  it('handles node clicks through the interaction model and effect runner', () => {
    const dependencies = createDependencies();
    const handlers = createGraphInteractionHandlers(dependencies);
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 100,
    });

    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );
    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );

    expect(findMessage('NODE_SELECTED')?.payload.nodeId).toBe('src/app.ts');
    expect(findMessage('NODE_DOUBLE_CLICKED')?.payload.nodeId).toBe('src/app.ts');
    expect(dependencies.fg2dRef.current?.centerAt).toHaveBeenCalledWith(0, 0, 300);
    expect(dependencies.fg2dRef.current?.zoom).toHaveBeenCalledWith(1.5, 300);
    expect(
      getSentMessages().some(
        message =>
          message.type === 'GRAPH_INTERACTION'
          && message.payload.event === 'graph:nodeDoubleClick',
      ),
    ).toBe(true);
  });

  it('clears graph selection when background click runs without an event', () => {
    const dependencies = createDependencies();
    dependencies.selectedNodesSetRef.current = new Set(['src/app.ts']);
    const handlers = createGraphInteractionHandlers(dependencies);

    handlers.handleBackgroundClick();

    expect(dependencies.graphCursorRef.current).toBe('default');
    expect(dependencies.highlightedNodeRef.current).toBeNull();
    expect(dependencies.selectedNodesSetRef.current.size).toBe(0);
    expect(dependencies.setSelectedNodes).toHaveBeenCalledWith([]);
    expect(
      getSentMessages().some(
        message =>
          message.type === 'GRAPH_INTERACTION'
          && message.payload.event === 'graph:backgroundClick',
      ),
    ).toBe(true);
  });
});
