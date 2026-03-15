import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../src/core/views';
import type { IGraphData } from '../../../src/shared/types';
import { createGraphViewProviderViewMethods } from '../../../src/extension/graphView/providerViewMethods';

describe('graphView/providerViewMethods', () => {
  it('updates graph data and returns the current graph snapshot', () => {
    const source = createSource();
    const methods = createGraphViewProviderViewMethods(source as never, createDependencies());
    const nextGraph = { nodes: [{ id: 'src/app.ts' }], edges: [] } satisfies IGraphData;

    methods.updateGraphData(nextGraph);

    expect(source._graphData).toEqual(nextGraph);
    expect(methods.getGraphData()).toEqual(nextGraph);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: nextGraph,
    });
  });

  it('builds view context from workspace and editor state', () => {
    const source = createSource();
    const buildViewContext = vi.fn(() => ({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#123456',
    } satisfies IViewContext));
    const methods = createGraphViewProviderViewMethods(
      source as never,
      createDependencies({
        getConfiguration: vi.fn(() => ({
          get: vi.fn(() => '#123456'),
        })),
        buildViewContext,
        getWorkspaceFolders: vi.fn(() => [{ uri: { fsPath: '/workspace' } }] as never),
        getActiveTextEditor: vi.fn(
          () => ({ document: { uri: { fsPath: '/workspace/src/app.ts' } } }) as never,
        ),
        asRelativePath: vi.fn(() => 'src/app.ts'),
      }),
    );

    methods._updateViewContext();

    expect(buildViewContext).toHaveBeenCalledOnce();
    expect(source._viewContext).toEqual({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#123456',
    });
  });

  it('applies the active transform and persists fallback view selections', () => {
    const source = createSource({
      _activeViewId: 'codegraphy.depth-graph',
    });
    const applyViewTransform = vi.fn(() => ({
      activeViewId: 'codegraphy.connections',
      graphData: { nodes: [{ id: 'transformed' }], edges: [] },
      persistSelectedViewId: 'codegraphy.connections',
    }));
    const sendAvailableViews = vi.fn();
    const methods = createGraphViewProviderViewMethods(
      source as never,
      createDependencies({
        applyViewTransform,
        sendAvailableViews,
      }),
    );

    methods._applyViewTransform();
    methods._sendAvailableViews();

    expect(applyViewTransform).toHaveBeenCalledWith(
      source._viewRegistry,
      'codegraphy.depth-graph',
      source._viewContext,
      source._rawGraphData,
    );
    expect(source._activeViewId).toBe('codegraphy.connections');
    expect(source._graphData).toEqual({ nodes: [{ id: 'transformed' }], edges: [] });
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.selectedView',
      'codegraphy.connections',
    );
    expect(sendAvailableViews).toHaveBeenCalledOnce();
  });

  it('delegates view switching and focused-file updates through view selection helpers', async () => {
    const source = createSource();
    const changeView = vi.fn(async (_state, nextViewId, handlers) => {
      expect(nextViewId).toBe('codegraphy.depth-graph');
      await handlers.persistActiveViewId(nextViewId);
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const setFocusedFile = vi.fn((_state, nextFilePath, handlers) => {
      expect(nextFilePath).toBe('src/app.ts');
      handlers.applyViewTransform();
      handlers.sendAvailableViews();
      handlers.sendMessage({ type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } });
    });
    const methods = createGraphViewProviderViewMethods(
      source as never,
      createDependencies({
        changeView,
        setFocusedFile,
      }),
    );

    await methods.changeView('codegraphy.depth-graph');
    methods.setFocusedFile('src/app.ts');

    expect(changeView).toHaveBeenCalledOnce();
    expect(setFocusedFile).toHaveBeenCalledOnce();
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.selectedView',
      'codegraphy.depth-graph',
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('delegates depth-limit changes and reads back the current limit', async () => {
    const source = createSource();
    const setDepthLimit = vi.fn(async (_state, nextDepthLimit, handlers) => {
      expect(nextDepthLimit).toBe(7);
      await handlers.persistDepthLimit(nextDepthLimit);
      handlers.applyViewTransform();
      handlers.sendMessage({
        type: 'DEPTH_LIMIT_UPDATED',
        payload: { depthLimit: nextDepthLimit },
      });
    });
    const getDepthLimit = vi.fn(() => 7);
    const methods = createGraphViewProviderViewMethods(
      source as never,
      createDependencies({
        setDepthLimit,
        getDepthLimit,
      }),
    );

    await methods.setDepthLimit(7);

    expect(setDepthLimit).toHaveBeenCalledOnce();
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.depthLimit',
      7,
    );
    expect(methods.getDepthLimit()).toBe(7);
    expect(getDepthLimit).toHaveBeenCalledWith(source._viewContext, 1);
  });
});

function createSource(
  overrides: Partial<{
    _context: { workspaceState: { get: typeof vi.fn; update: typeof vi.fn } };
    _analyzer: unknown;
    _viewRegistry: unknown;
    _viewContext: IViewContext;
    _activeViewId: string;
    _rawGraphData: IGraphData;
    _graphData: IGraphData;
    _sendMessage: ReturnType<typeof vi.fn>;
  }> = {},
) {
  return {
    _context: {
      workspaceState: {
        get: vi.fn(() => 1),
        update: vi.fn(() => Promise.resolve()),
      },
    },
    _analyzer: { registry: { list: vi.fn(() => []) } },
    _viewRegistry: {
      get: vi.fn(() => ({ view: { id: 'codegraphy.connections' } })),
      isViewAvailable: vi.fn(() => true),
    },
    _viewContext: {
      activePlugins: new Set<string>(),
      depthLimit: 1,
    } satisfies IViewContext,
    _activeViewId: 'codegraphy.connections',
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _sendMessage: vi.fn(),
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<Parameters<typeof createGraphViewProviderViewMethods>[1]> = {},
) {
  return {
    getConfiguration: vi.fn(() => ({
      get: vi.fn((_: string, fallback: unknown) => fallback),
    })),
    getWorkspaceFolders: vi.fn(() => []),
    getActiveTextEditor: vi.fn(() => undefined),
    asRelativePath: vi.fn((uri: { fsPath?: string }) => uri.fsPath ?? ''),
    buildViewContext: vi.fn(() => ({
      activePlugins: new Set<string>(),
      depthLimit: 1,
    })),
    applyViewTransform: vi.fn((_, activeViewId: string, __, rawGraphData: IGraphData) => ({
      activeViewId,
      graphData: rawGraphData,
    })),
    sendAvailableViews: vi.fn(),
    changeView: vi.fn(async () => undefined),
    setFocusedFile: vi.fn(),
    setDepthLimit: vi.fn(async () => undefined),
    getDepthLimit: vi.fn((viewContext: IViewContext, defaultDepthLimit: number) =>
      viewContext.depthLimit ?? defaultDepthLimit,
    ),
    normalizeFolderNodeColor: vi.fn((color: string) => color),
    defaultDepthLimit: 1,
    defaultFolderNodeColor: '#93C5FD',
    selectedViewKey: 'codegraphy.selectedView',
    depthLimitKey: 'codegraphy.depthLimit',
    logUnavailableView: vi.fn(),
    ...overrides,
  };
}
