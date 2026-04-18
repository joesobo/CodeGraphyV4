import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../src/shared/graph/contracts';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';
import { resetCurrentCodeGraphyConfigurationForTest } from '../../src/extension/repoSettings/current';
import { getGraphViewProviderInternals } from './graphViewProvider/internals';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;
let currentConfiguration: ReturnType<typeof createConfiguration>;

Object.defineProperty(vscode.workspace, 'workspaceFolders', {
  get: () => workspaceFoldersValue,
  configurable: true,
});

function createContext() {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn(() => undefined),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

function createConfiguration(values: Record<string, unknown>) {
  return {
    get<T>(section: string, defaultValue: T): T {
      return (values[section] as T | undefined) ?? defaultValue;
    },
    update: vi.fn(() => Promise.resolve()),
    inspect: vi.fn(() => undefined),
  };
}

describe('GraphViewProvider view state and internal helpers', () => {
  beforeEach(() => {
    resetCurrentCodeGraphyConfigurationForTest();
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    currentConfiguration = createConfiguration({});
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn(() => currentConfiguration);
    (vscode.workspace as unknown as { asRelativePath: ReturnType<typeof vi.fn> }).asRelativePath =
      vi.fn((uri: vscode.Uri) => uri.fsPath.replace('/test/workspace/', ''));
    vi.clearAllMocks();
  });

  it('allows enabling depth mode without a focused file', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const applySpy = vi.spyOn(
      internals._viewContextMethods,
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.setDepthMode(true);

    expect((provider as unknown as { _depthMode: boolean })._depthMode).toBe(true);
    expect(currentConfiguration.update).toHaveBeenCalledWith(
      'depthMode',
      true,
      undefined,
    );
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: true },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('persists depth mode and refreshes graph data when depth mode is enabled', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    provider.setFocusedFile('src/app.ts');
    const applySpy = vi.spyOn(
      internals._viewContextMethods,
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.setDepthMode(true);

    expect((provider as unknown as { _depthMode: boolean })._depthMode).toBe(true);
    expect(currentConfiguration.update).toHaveBeenCalledWith(
      'depthMode',
      true,
      undefined,
    );
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: true },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('clamps depth limits and re-sends graph data when depth mode is active', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    (provider as unknown as { _depthMode: boolean })._depthMode = true;
    const applySpy = vi.spyOn(
      internals._viewContextMethods,
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.setDepthLimit(99);

    expect((provider as unknown as { _viewContext: { depthLimit: number } })._viewContext.depthLimit).toBe(10);
    expect(currentConfiguration.update).toHaveBeenCalledWith('depthLimit', 10, undefined);
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 10 },
    });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('updates the depth limit without re-sending graph data outside depth view', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const applySpy = vi.spyOn(
      internals._viewContextMethods,
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.setDepthLimit(0);

    expect((provider as unknown as { _viewContext: { depthLimit: number } })._viewContext.depthLimit).toBe(1);
    expect(currentConfiguration.update).toHaveBeenCalledWith('depthLimit', 1, undefined);
    expect(applySpy).not.toHaveBeenCalled();
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'DEPTH_LIMIT_UPDATED',
      payload: { depthLimit: 1 },
    });
    expect(sendMessageSpy).not.toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: expect.anything(),
    });
  });

  it('sends the full settings payload set from configuration', () => {
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn(() =>
        createConfiguration({
          bidirectionalEdges: 'combined',
          showOrphans: false,
          directionMode: 'particles',
          particleSpeed: 0.02,
          particleSize: 7,
          directionColor: '#00ff00',
          showLabels: false,
        })
      );

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});

    internals._settingsStateMethods._sendSettings();

    expect(sendMessageSpy).toHaveBeenNthCalledWith(1, {
      type: 'SETTINGS_UPDATED',
      payload: { bidirectionalEdges: 'combined', showOrphans: false },
    });
    expect(sendMessageSpy).toHaveBeenNthCalledWith(2, {
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: {
        directionMode: 'particles',
        particleSpeed: 0.02,
        particleSize: 7,
        directionColor: '#00FF00',
      },
    });
    expect(sendMessageSpy).toHaveBeenNthCalledWith(3, {
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
  });

  it('sends physics settings from configuration', () => {
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn(() =>
        createConfiguration({
          'physics.repelForce': 14,
          'physics.linkDistance': 90,
          'physics.linkForce': 0.25,
          'physics.damping': 0.6,
          'physics.centerForce': 0.2,
        })
      );

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});

    internals._physicsSettingsMethods._sendPhysicsSettings();

    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: {
        repelForce: 14,
        linkDistance: 90,
        linkForce: 0.25,
        damping: 0.6,
        centerForce: 0.2,
      },
    });
  });

  it('returns no plugin default groups when no analyzer is ready', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);

    expect(internals._pluginResourceMethods._getPluginDefaultGroups()).toEqual([]);
  });

  it('rebuilds graph data and notifies dependents when analyzer state is available', () => {
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn(() => createConfiguration({ showOrphans: false }));

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const graphData: IGraphData = {
      nodes: [{ id: 'src/app.ts', label: 'app.ts', color: '#ffffff' }],
      edges: [],
    };
    const rebuildGraph = vi.fn(() => graphData);
    const notifyGraphRebuild = vi.fn();
    (provider as unknown as {
      _analyzer: {
        rebuildGraph: typeof rebuildGraph;
        registry: { notifyGraphRebuild: typeof notifyGraphRebuild };
      };
    })._analyzer = {
      rebuildGraph,
      registry: { notifyGraphRebuild },
    };
    const updateViewContextSpy = vi.spyOn(
      internals._viewContextMethods,
      '_updateViewContext'
    ).mockImplementation(() => {});
    const applySpy = vi.spyOn(
      internals._viewContextMethods,
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendViewsSpy = vi.spyOn(
      internals._viewContextMethods,
      '_sendDepthState'
    ).mockImplementation(() => {});
    const sendStatusesSpy = vi.spyOn(
      internals._pluginMethods,
      '_sendPluginStatuses'
    ).mockImplementation(() => {});
    const sendDecorationsSpy = vi.spyOn(
      internals._pluginMethods,
      '_sendDecorations'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      internals._webviewMethods,
      '_sendMessage'
    ).mockImplementation(() => {});

    internals._refreshMethods._rebuildAndSend();

    expect(rebuildGraph).toHaveBeenCalledWith(new Set(), false);
    expect((provider as unknown as { _rawGraphData: IGraphData })._rawGraphData).toEqual(graphData);
    expect(updateViewContextSpy).toHaveBeenCalledTimes(1);
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(sendViewsSpy).toHaveBeenCalledTimes(1);
    expect(sendStatusesSpy).toHaveBeenCalledTimes(1);
    expect(sendDecorationsSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(notifyGraphRebuild).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('applies refreshed resource roots to editor panels', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const panelWebview = { options: {}, asWebviewUri: vi.fn((uri: vscode.Uri) => uri) };
    (provider as unknown as {
      _view?: unknown;
      _panels: Array<{ webview: typeof panelWebview }>;
    })._panels = [{ webview: panelWebview }];

    internals._pluginResourceMethods._refreshWebviewResourceRoots();

    expect(
      (panelWebview.options as { localResourceRoots?: Array<{ fsPath: string }> }).localResourceRoots?.some(
        (uri) => uri.fsPath === '/test/extension'
      )
    ).toBe(true);
  });
});
