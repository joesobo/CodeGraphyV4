import { describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../src/core/views';
import type { IGraphData } from '../../../src/shared/types';
import { createGraphViewProviderViewContextMethods } from '../../../src/extension/graphView/providerViewContextMethods';

describe('graphView/providerViewContextMethods', () => {
  it('updates graph data and returns the current graph snapshot', () => {
    const source = createSource();
    const methods = createGraphViewProviderViewContextMethods(source as never, createDependencies());
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
    const configuration = {
      get: vi.fn(() => '#123456'),
    };
    const getConfiguration = vi.fn(() => configuration);
    const normalizeFolderNodeColor = vi.fn(() => '#654321');
    const asRelativePath = vi.fn(() => 'src/app.ts');
    const workspaceFolders = [{ uri: { fsPath: '/workspace' } }] as never;
    const activeEditor = { document: { uri: { fsPath: '/workspace/src/app.ts' } } } as never;
    const buildViewContext = vi.fn(() => ({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#123456',
    } satisfies IViewContext));
    const methods = createGraphViewProviderViewContextMethods(
      source as never,
      createDependencies({
        getConfiguration,
        buildViewContext,
        getWorkspaceFolders: vi.fn(() => workspaceFolders),
        getActiveTextEditor: vi.fn(() => activeEditor),
        asRelativePath,
        normalizeFolderNodeColor,
      }),
    );

    methods._updateViewContext();

    expect(buildViewContext).toHaveBeenCalledOnce();
    expect(getConfiguration).toHaveBeenCalledWith('codegraphy');
    const options = buildViewContext.mock.calls[0]?.[0] as {
      analyzer: unknown;
      workspaceFolders: unknown;
      activeEditor: unknown;
      readSavedDepthLimit(): number;
      readFolderNodeColor(): string;
      asRelativePath(uri: { fsPath: string }): string;
      defaultDepthLimit: number;
    };
    expect(options.analyzer).toBe(source._analyzer);
    expect(options.workspaceFolders).toBe(workspaceFolders);
    expect(options.activeEditor).toBe(activeEditor);
    expect(options.readSavedDepthLimit()).toBe(1);
    expect(options.readFolderNodeColor()).toBe('#654321');
    expect(options.asRelativePath({ fsPath: '/workspace/src/app.ts' })).toBe('src/app.ts');
    expect(options.defaultDepthLimit).toBe(1);
    expect(source._context.workspaceState.get).toHaveBeenCalledWith('codegraphy.depthLimit');
    expect(configuration.get).toHaveBeenCalledWith('folderNodeColor', '#93C5FD');
    expect(normalizeFolderNodeColor).toHaveBeenCalledWith('#123456');
    expect(asRelativePath).toHaveBeenCalledWith({ fsPath: '/workspace/src/app.ts' });
    expect(source._viewContext).toEqual({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#123456',
    });
  });

  it('sends available views through the provider message bridge', () => {
    const source = createSource({
      _activeViewId: 'codegraphy.depth-graph',
      _viewContext: {
        activePlugins: new Set<string>(['plugin.test']),
        depthLimit: 3,
      } satisfies IViewContext,
    });
    const sendAvailableViews = vi.fn(
      (_registry, _viewContext, _activeViewId, _defaultDepthLimit, sendMessage) => {
        sendMessage({
          type: 'VIEWS_UPDATED',
          payload: { views: [], activeViewId: 'codegraphy.depth-graph' },
        });
      },
    );
    const methods = createGraphViewProviderViewContextMethods(
      source as never,
      createDependencies({
        sendAvailableViews,
      }),
    );

    methods._sendAvailableViews();

    expect(sendAvailableViews).toHaveBeenCalledWith(
      source._viewRegistry,
      source._viewContext,
      'codegraphy.depth-graph',
      1,
      expect.any(Function),
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'VIEWS_UPDATED',
      payload: { views: [], activeViewId: 'codegraphy.depth-graph' },
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
    const methods = createGraphViewProviderViewContextMethods(
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

  it('keeps the current selected view when the transform does not request persistence', () => {
    const source = createSource({
      _activeViewId: 'codegraphy.depth-graph',
    });
    const applyViewTransform = vi.fn(() => ({
      activeViewId: 'codegraphy.connections',
      graphData: { nodes: [{ id: 'transformed' }], edges: [] },
      persistSelectedViewId: undefined,
    }));
    const methods = createGraphViewProviderViewContextMethods(
      source as never,
      createDependencies({
        applyViewTransform,
      }),
    );

    methods._applyViewTransform();

    expect(source._activeViewId).toBe('codegraphy.connections');
    expect(source._graphData).toEqual({ nodes: [{ id: 'transformed' }], edges: [] });
    expect(source._context.workspaceState.update).not.toHaveBeenCalled();
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
  overrides: Partial<Parameters<typeof createGraphViewProviderViewContextMethods>[1]> = {},
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
    normalizeFolderNodeColor: vi.fn((color: string) => color),
    defaultDepthLimit: 1,
    defaultFolderNodeColor: '#93C5FD',
    selectedViewKey: 'codegraphy.selectedView',
    ...overrides,
  };
}
