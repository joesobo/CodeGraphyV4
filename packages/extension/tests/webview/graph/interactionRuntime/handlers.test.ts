import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ForceGraphMethods as FG2DMethods,
} from 'react-force-graph-2d';
import type {
  ForceGraphMethods as FG3DMethods,
} from 'react-force-graph-3d';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import type { FGLink, FGNode } from '../../../../src/webview/components/graph/model/build';
import {
  createGraphInteractionHandlers,
  type GraphInteractionHandlersDependencies,
} from '../../../../src/webview/components/graph/interactionRuntime/handlers';
import {
  clearSentMessages,
  findMessage,
  getSentMessages,
} from '../../../helpers/sentMessages';

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
      { id: 'src/app.ts->src/utils.ts', from: 'src/app.ts', to: 'src/utils.ts' , kind: 'import', sources: [] },
      { id: 'src/other.ts->src/app.ts', from: 'src/other.ts', to: 'src/app.ts' , kind: 'import', sources: [] },
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
    depthMode: false,
    fg2dRef: createRef(fg2d),
    fg3dRef: createRef(fg3d),
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

describe('graph/interactionRuntime/handlers', () => {
  beforeEach(() => {
    clearSentMessages();
    vi.clearAllMocks();
  });

  it('applies the graph cursor to the container surface when available', () => {
    const dependencies = createDependencies();
    const canvas = document.createElement('canvas');
    const child = document.createElement('div');
    dependencies.containerRef.current?.append(canvas, child);
    const handlers = createGraphInteractionHandlers(dependencies);

    handlers.setGraphCursor('pointer');

    expect(dependencies.graphCursorRef.current).toBe('pointer');
    expect(dependencies.containerRef.current?.style.cursor).toBe('pointer');
    expect(canvas.style.cursor).toBe('pointer');
    expect(child.style.cursor).toBe('pointer');
  });

  it('updates the cursor ref without touching the dom when no container exists', () => {
    const dependencies = createDependencies({
      containerRef: createRef<HTMLDivElement | null>(null),
    });
    const handlers = createGraphInteractionHandlers(dependencies);

    expect(() => {
      handlers.setGraphCursor('pointer');
    }).not.toThrow();
    expect(dependencies.graphCursorRef.current).toBe('pointer');
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
    const dispatchEvent = vi.spyOn(dependencies.containerRef.current as EventTarget, 'dispatchEvent');
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
    expect(findMessage('CLEAR_FOCUSED_FILE')).toEqual({ type: 'CLEAR_FOCUSED_FILE' });
    expect(
      getSentMessages().some(
        message =>
          message.type === 'GRAPH_INTERACTION'
          && message.payload.event === 'graph:backgroundClick',
      ),
    ).toBe(true);
  });

  it('clears the focused file when re-clicking the only selected node outside double-click timing', () => {
    const dependencies = createDependencies();
    const handlers = createGraphInteractionHandlers(dependencies);
    const event = new MouseEvent('click', {
      clientX: 100,
      clientY: 100,
    });
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValueOnce(100);
    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );
    clearSentMessages();
    nowSpy.mockReturnValueOnce(1000);

    handlers.handleNodeClick(
      { id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' } as FGNode,
      event,
    );

    expect(dependencies.selectedNodesSetRef.current.size).toBe(0);
    expect(dependencies.setSelectedNodes).toHaveBeenLastCalledWith([]);
    expect(findMessage('CLEAR_FOCUSED_FILE')).toEqual({ type: 'CLEAR_FOCUSED_FILE' });
    nowSpy.mockRestore();
  });

  it('wires the composed handler factories and re-exports their handlers', async () => {
    vi.resetModules();

    const selectionHandlers = {
      clearSelection: vi.fn(),
      selectOnlyNode: vi.fn(),
      setHighlight: vi.fn(),
      setSelection: vi.fn(),
    };
    const contextMenuHandlers = {
      openBackgroundContextMenu: vi.fn(),
      openEdgeContextMenu: vi.fn(),
      openNodeContextMenu: vi.fn(),
    };
    const viewHandlers = {
      fitView: vi.fn(),
      focusNodeById: vi.fn(),
      updateAccessCount: vi.fn(),
      zoom2d: vi.fn(),
    };
    const effectHandlers = {
      applyGraphInteractionEffects: vi.fn(),
      previewNode: vi.fn(),
      requestNodeOpenById: vi.fn(),
      sendGraphInteraction: vi.fn(),
    };
    const clickHandlers = {
      handleBackgroundClick: vi.fn(),
      handleLinkClick: vi.fn(),
      handleNodeClick: vi.fn(),
    };
    const applyCursorToGraphSurface = vi.fn();
    const createSelectionHandlers = vi.fn(() => selectionHandlers);
    const createContextMenuHandlers = vi.fn(() => contextMenuHandlers);
    const createViewHandlers = vi.fn(() => viewHandlers);
    const createEffectHandlers = vi.fn(() => effectHandlers);
    const createClickHandlers = vi.fn(() => clickHandlers);

    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/selection', () => ({
      createSelectionHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/contextMenu', () => ({
      createContextMenuHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/view', () => ({
      createViewHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/effects', () => ({
      createEffectHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/interactionRuntime/click', () => ({
      createClickHandlers,
    }));
    vi.doMock('../../../../src/webview/components/graph/support/dom', async () => {
      const actual = await vi.importActual<
        typeof import('../../../../src/webview/components/graph/support/dom')
      >('../../../../src/webview/components/graph/support/dom');
      return {
        ...actual,
        applyCursorToGraphSurface,
      };
    });

    const { createGraphInteractionHandlers: createHandlers } = await import(
      '../../../../src/webview/components/graph/interactionRuntime/handlers'
    );
    const dependencies = createDependencies();
    const handlers = createHandlers(dependencies);
    const clickCallbacks = createClickHandlers.mock.calls[0] as unknown as [
      unknown,
      {
        applyGraphInteractionEffects: typeof effectHandlers.applyGraphInteractionEffects;
        setGraphCursor: typeof applyCursorToGraphSurface;
      },
    ];
    if (!clickCallbacks) {
      throw new Error('missing click handler call');
    }

    expect(createSelectionHandlers).toHaveBeenCalledWith(dependencies);
    expect(createContextMenuHandlers).toHaveBeenCalledWith(
      dependencies,
      selectionHandlers.setSelection,
    );
    expect(createViewHandlers).toHaveBeenCalledWith(dependencies);
    expect(createEffectHandlers).toHaveBeenCalledWith(dependencies, {
      clearSelection: selectionHandlers.clearSelection,
      focusNodeById: viewHandlers.focusNodeById,
      openBackgroundContextMenu: contextMenuHandlers.openBackgroundContextMenu,
      openEdgeContextMenu: contextMenuHandlers.openEdgeContextMenu,
      openNodeContextMenu: contextMenuHandlers.openNodeContextMenu,
      selectOnlyNode: selectionHandlers.selectOnlyNode,
      setSelection: selectionHandlers.setSelection,
    });
    expect(createClickHandlers).toHaveBeenCalledWith(dependencies, {
      applyGraphInteractionEffects: effectHandlers.applyGraphInteractionEffects,
      setGraphCursor: clickCallbacks[1].setGraphCursor,
    });

    expect(handlers.applyGraphInteractionEffects).toBe(effectHandlers.applyGraphInteractionEffects);
    expect(handlers.clearSelection).toBe(selectionHandlers.clearSelection);
    expect(handlers.fitView).toBe(viewHandlers.fitView);
    expect(handlers.focusNodeById).toBe(viewHandlers.focusNodeById);
    expect(handlers.handleBackgroundClick).toBe(clickHandlers.handleBackgroundClick);
    expect(handlers.handleLinkClick).toBe(clickHandlers.handleLinkClick);
    expect(handlers.handleNodeClick).toBe(clickHandlers.handleNodeClick);
    expect(handlers.openBackgroundContextMenu).toBe(contextMenuHandlers.openBackgroundContextMenu);
    expect(handlers.openEdgeContextMenu).toBe(contextMenuHandlers.openEdgeContextMenu);
    expect(handlers.openNodeContextMenu).toBe(contextMenuHandlers.openNodeContextMenu);
    expect(handlers.previewNode).toBe(effectHandlers.previewNode);
    expect(handlers.requestNodeOpenById).toBe(effectHandlers.requestNodeOpenById);
    expect(handlers.selectOnlyNode).toBe(selectionHandlers.selectOnlyNode);
    expect(handlers.sendGraphInteraction).toBe(effectHandlers.sendGraphInteraction);
    expect(handlers.setGraphCursor).toBe(clickCallbacks[1].setGraphCursor);
    expect(handlers.setHighlight).toBe(selectionHandlers.setHighlight);
    expect(handlers.setSelection).toBe(selectionHandlers.setSelection);
    expect(handlers.updateAccessCount).toBe(viewHandlers.updateAccessCount);
    expect(handlers.zoom2d).toBe(viewHandlers.zoom2d);

    handlers.setGraphCursor('pointer');

    expect(dependencies.graphCursorRef.current).toBe('pointer');
    expect(applyCursorToGraphSurface).toHaveBeenCalledWith(
      dependencies.containerRef.current,
      'pointer',
    );

    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/selection');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/contextMenu');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/view');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/effects');
    vi.doUnmock('../../../../src/webview/components/graph/interactionRuntime/click');
    vi.doUnmock('../../../../src/webview/components/graph/support/dom');
    vi.resetModules();
  });
});
