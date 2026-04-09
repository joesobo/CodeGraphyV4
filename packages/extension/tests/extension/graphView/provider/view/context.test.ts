import * as vscode from 'vscode';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IViewContext } from '../../../../../src/core/views/contracts';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import { buildGraphViewContext } from '../../../../../src/extension/graphView/view/context';
import { applyGraphViewTransform, type IGraphViewTransformResult } from '../../../../../src/extension/graphView/presentation';
import type { GraphViewProviderViewContextMethodDependencies } from '../../../../../src/extension/graphView/provider/view/context';
const providerViewContextMethodMocks = vi.hoisted(() => ({
  buildViewContext: vi.fn(),
  applyViewTransform: vi.fn(),
  sendAvailableViews: vi.fn(),
  normalizeFolderNodeColor: vi.fn(),
}));

vi.mock('../../../../../src/extension/graphView/view/context', () => ({
  buildGraphViewContext: providerViewContextMethodMocks.buildViewContext,
}));

vi.mock('../../../../../src/extension/graphView/view/broadcast', () => ({
  sendGraphViewAvailableViews: providerViewContextMethodMocks.sendAvailableViews,
}));

vi.mock('../../../../../src/extension/graphView/presentation', () => ({
  applyGraphViewTransform: providerViewContextMethodMocks.applyViewTransform,
}));

vi.mock('../../../../../src/extension/graphView/settings/reader', () => ({
  normalizeFolderNodeColor: providerViewContextMethodMocks.normalizeFolderNodeColor,
}));

import { createGraphViewProviderViewContextMethods } from '../../../../../src/extension/graphView/provider/view/context';

describe('graphView/provider/view/context', () => {
  beforeEach(() => {
    providerViewContextMethodMocks.buildViewContext.mockReset();
    providerViewContextMethodMocks.applyViewTransform.mockReset();
    providerViewContextMethodMocks.sendAvailableViews.mockReset();
    providerViewContextMethodMocks.normalizeFolderNodeColor.mockReset();
  });

  it('updates graph data and returns the current graph snapshot', () => {
    const source = createSource();
    const methods = createGraphViewProviderViewContextMethods(source as never, createDependencies());
    const nextGraph = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#93C5FD' }],
      edges: [],
    } satisfies IGraphData;

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
      get: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'depthLimit') {
          return 1 as T;
        }
        if (key === 'nodeColors') {
          return { folder: '#123456' } as T;
        }
        return defaultValue;
      }),
      update: vi.fn(() => Promise.resolve()),
    };
    const getConfiguration = vi.fn(() => configuration);
    const normalizeFolderNodeColor = vi.fn(() => '#654321');
    const asRelativePath = vi.fn(() => 'src/app.ts');
    const workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'workspace', index: 0 }] as never;
    const activeEditor = { document: { uri: { fsPath: '/workspace/src/app.ts' } } } as never;
    const buildViewContext = vi.fn(
      (_options: Parameters<typeof buildGraphViewContext>[0]) => ({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#123456',
      } satisfies IViewContext),
    );
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
    expect(configuration.get).toHaveBeenCalledWith('depthLimit', 1);
    expect(configuration.get).toHaveBeenCalledWith('nodeColors', {});
    expect(normalizeFolderNodeColor).toHaveBeenCalledWith('#123456');
    expect(asRelativePath).toHaveBeenCalledWith({ fsPath: '/workspace/src/app.ts' });
    expect(source._viewContext).toEqual({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#123456',
    });
  });

  it('uses the live vscode defaults to build the view context', () => {
    const source = createSource();
    const configurationGet = vi.fn(<T>(key: string, defaultValue: T): T => {
      if (key === 'depthLimit') {
        return 1 as T;
      }
      if (key === 'nodeColors') {
        return { folder: '#123456' } as T;
      }
      return defaultValue;
    });
    const getConfiguration = vi
      .spyOn(vscode.workspace, 'getConfiguration')
      .mockReturnValue({ get: configurationGet, update: vi.fn(() => Promise.resolve()) } as never);
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const workspaceFolders = vi
      .spyOn(vscode.workspace, 'workspaceFolders', 'get')
      .mockReturnValue([workspaceFolder]);
    const activeEditor = { document: { uri: vscode.Uri.file('/workspace/src/app.ts') } } as never;
    const originalActiveTextEditor = (vscode.window as { activeTextEditor?: unknown }).activeTextEditor;
    Object.defineProperty(vscode.window, 'activeTextEditor', {
      configurable: true,
      value: activeEditor,
    });
    const originalAsRelativePath = (vscode.workspace as { asRelativePath?: unknown }).asRelativePath;
    const asRelativePath = vi.fn(() => 'src/app.ts');
    Object.defineProperty(vscode.workspace, 'asRelativePath', {
      configurable: true,
      value: asRelativePath,
    });

    providerViewContextMethodMocks.normalizeFolderNodeColor.mockReturnValue('#654321');
    providerViewContextMethodMocks.buildViewContext.mockReturnValue({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#654321',
    } satisfies IViewContext);

    const methods = createGraphViewProviderViewContextMethods(source as never);

    methods._updateViewContext();

    expect(getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(providerViewContextMethodMocks.buildViewContext).toHaveBeenCalledOnce();
    const options = providerViewContextMethodMocks.buildViewContext.mock.calls[0]?.[0] as {
      analyzer: unknown;
      workspaceFolders: unknown;
      activeEditor: unknown;
      readSavedDepthLimit(): number;
      readFolderNodeColor(): string;
      asRelativePath(uri: vscode.Uri): string;
      defaultDepthLimit: number;
    };
    expect(options.analyzer).toBe(source._analyzer);
    expect(options.workspaceFolders).toEqual([workspaceFolder]);
    expect(options.activeEditor).toBe(activeEditor);
    expect(options.readSavedDepthLimit()).toBe(1);
    expect(options.readFolderNodeColor()).toBe('#654321');
    expect(options.asRelativePath(vscode.Uri.file('/workspace/src/app.ts'))).toBe('src/app.ts');
    expect(options.defaultDepthLimit).toBe(1);
    expect(configurationGet).toHaveBeenCalledWith('depthLimit', 1);
    expect(configurationGet).toHaveBeenCalledWith('nodeColors', {});
    expect(providerViewContextMethodMocks.normalizeFolderNodeColor).toHaveBeenCalledWith('#123456');
    expect(asRelativePath).toHaveBeenCalledWith(vscode.Uri.file('/workspace/src/app.ts'));
    expect(source._viewContext).toEqual({
      activePlugins: new Set<string>(['plugin.test']),
      depthLimit: 3,
      focusedFile: 'src/app.ts',
      folderNodeColor: '#654321',
    });

    if (originalAsRelativePath === undefined) {
      delete (vscode.workspace as { asRelativePath?: unknown }).asRelativePath;
    } else {
      Object.defineProperty(vscode.workspace, 'asRelativePath', {
        configurable: true,
        value: originalAsRelativePath,
      });
    }
    if (originalActiveTextEditor === undefined) {
      delete (vscode.window as { activeTextEditor?: unknown }).activeTextEditor;
    } else {
      Object.defineProperty(vscode.window, 'activeTextEditor', {
        configurable: true,
        value: originalActiveTextEditor,
      });
    }
    workspaceFolders.mockRestore();
    getConfiguration.mockRestore();
  });

  it('sends available views through the provider message bridge', () => {
    const source = createSource({
      _activeViewId: 'codegraphy.depth-graph',
      _depthMode: true,
      _viewContext: {
        activePlugins: new Set<string>(['plugin.test']),
        depthLimit: 3,
      } satisfies IViewContext,
    });
    const sendAvailableViews = vi.fn(
      (
        _registry,
        _viewContext,
        _activeViewId,
        _depthMode,
        _rawGraphData,
        _defaultDepthLimit,
        sendMessage,
      ) => {
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
      true,
      source._rawGraphData,
      1,
      expect.any(Function),
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'VIEWS_UPDATED',
      payload: { views: [], activeViewId: 'codegraphy.depth-graph' },
    });
  });

  it('applies the active transform without persisting fallback view selections', () => {
    const source = createSource({
      _activeViewId: 'codegraphy.depth-graph',
    });
    const applyViewTransform = vi.fn(() => ({
      activeViewId: 'codegraphy.connections',
      graphData: {
        nodes: [{ id: 'transformed', label: 'transformed', color: '#93C5FD' }],
        edges: [],
      },
      persistSelectedViewId: 'codegraphy.connections',
    } satisfies IGraphViewTransformResult));
    const sendAvailableViews = vi.fn();
    const dependencies = createDependencies({
      applyViewTransform,
      sendAvailableViews,
    });
    const methods = createGraphViewProviderViewContextMethods(
      source as never,
      dependencies,
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
    expect(source._graphData).toEqual({
      nodes: [{ id: 'transformed', label: 'transformed', color: '#93C5FD' }],
      edges: [],
    });
    const configuration = dependencies.getConfiguration('codegraphy');
    expect(configuration.update).not.toHaveBeenCalledWith(
      expect.stringMatching(/selectedView/),
      expect.anything(),
    );
    expect(sendAvailableViews).toHaveBeenCalledOnce();
  });

  it('uses the live default transform and view broadcast helpers', () => {
    const source = createSource({
      _activeViewId: 'codegraphy.depth-graph',
      _depthMode: true,
      _viewContext: {
        activePlugins: new Set<string>(['plugin.test']),
        depthLimit: 2,
      } satisfies IViewContext,
    });
    providerViewContextMethodMocks.applyViewTransform.mockReturnValue({
      activeViewId: 'codegraphy.connections',
      graphData: {
        nodes: [{ id: 'transformed', label: 'transformed', color: '#93C5FD' }],
        edges: [],
      },
      persistSelectedViewId: 'codegraphy.connections',
    } satisfies IGraphViewTransformResult);
    providerViewContextMethodMocks.sendAvailableViews.mockImplementation(
      (
        _registry,
        _viewContext,
        _activeViewId,
        _depthMode,
        _rawGraphData,
        _defaultDepthLimit,
        sendMessage,
      ) => {
        sendMessage({
          type: 'VIEWS_UPDATED',
          payload: { views: [], activeViewId: 'codegraphy.connections' },
        });
      },
    );
    const update = vi.fn(() => Promise.resolve());
    vi.spyOn(vscode.workspace, 'getConfiguration')
      .mockReturnValue({ get: vi.fn((_: string, fallback: unknown) => fallback), update } as never);

    const methods = createGraphViewProviderViewContextMethods(source as never);

    methods._applyViewTransform();
    methods._sendAvailableViews();

    expect(providerViewContextMethodMocks.applyViewTransform).toHaveBeenCalledWith(
      source._viewRegistry,
      'codegraphy.depth-graph',
      source._viewContext,
      source._rawGraphData,
    );
    expect(source._activeViewId).toBe('codegraphy.connections');
    expect(source._graphData).toEqual({
      nodes: [{ id: 'transformed', label: 'transformed', color: '#93C5FD' }],
      edges: [],
    });
    expect(update).not.toHaveBeenCalledWith(
      expect.stringMatching(/selectedView/),
      expect.anything(),
    );
    expect(providerViewContextMethodMocks.sendAvailableViews).toHaveBeenCalledWith(
      source._viewRegistry,
      source._viewContext,
      'codegraphy.connections',
      true,
      source._rawGraphData,
      1,
      expect.any(Function),
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'VIEWS_UPDATED',
      payload: { views: [], activeViewId: 'codegraphy.connections' },
    });
  });

  it('keeps the current selected view when the transform does not request persistence', () => {
    const source = createSource({
      _activeViewId: 'codegraphy.depth-graph',
    });
    const applyViewTransform = vi.fn(() => ({
      activeViewId: 'codegraphy.connections',
      graphData: {
        nodes: [{ id: 'transformed', label: 'transformed', color: '#93C5FD' }],
        edges: [],
      },
    } satisfies IGraphViewTransformResult));
    const dependencies = createDependencies({
      applyViewTransform,
    });
    const methods = createGraphViewProviderViewContextMethods(
      source as never,
      dependencies,
    );

    methods._applyViewTransform();

    expect(source._activeViewId).toBe('codegraphy.connections');
    expect(source._graphData).toEqual({
      nodes: [{ id: 'transformed', label: 'transformed', color: '#93C5FD' }],
      edges: [],
    });
    expect(dependencies.getConfiguration('codegraphy').update).not.toHaveBeenCalled();
  });
});

function createSource(
  overrides: Partial<{
    _context: { workspaceState: { get: typeof vi.fn; update: typeof vi.fn } };
    _analyzer: unknown;
    _viewRegistry: unknown;
    _viewContext: IViewContext;
    _activeViewId: string;
    _depthMode: boolean;
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
    _depthMode: false,
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _sendMessage: vi.fn(),
    ...overrides,
  };
}

function createDependencies(
  overrides: Partial<GraphViewProviderViewContextMethodDependencies> = {},
): GraphViewProviderViewContextMethodDependencies {
  const configuration = {
    get: vi.fn((_: string, fallback: unknown) => fallback),
    update: vi.fn(() => Promise.resolve()),
  } as {
    get<T>(section: string, defaultValue: T): T;
    update(key: string, value: unknown, target?: unknown): Promise<void>;
  };
  const getConfiguration: GraphViewProviderViewContextMethodDependencies['getConfiguration'] = vi.fn(
    () => configuration,
  );
  const buildViewContext: GraphViewProviderViewContextMethodDependencies['buildViewContext'] =
    vi.fn((_options: Parameters<typeof buildGraphViewContext>[0]) => ({
      activePlugins: new Set<string>(),
      depthLimit: 1,
    } satisfies IViewContext));
  const applyViewTransform: GraphViewProviderViewContextMethodDependencies['applyViewTransform'] =
    vi.fn((...args: Parameters<typeof applyGraphViewTransform>) => {
      const [, activeViewId, , rawGraphData] = args;
      return {
        activeViewId,
        graphData: rawGraphData,
      } satisfies IGraphViewTransformResult;
    });
  return {
    getConfiguration,
    getWorkspaceFolders: vi.fn(() => []),
    getActiveTextEditor: vi.fn(() => undefined),
    asRelativePath: vi.fn((uri: { fsPath?: string }) => uri.fsPath ?? ''),
    buildViewContext,
    applyViewTransform,
    sendAvailableViews: vi.fn(),
    normalizeFolderNodeColor: vi.fn((color: string | undefined) => color ?? '#93C5FD'),
    defaultDepthLimit: 1,
    defaultFolderNodeColor: '#93C5FD',
    ...overrides,
  };
}
