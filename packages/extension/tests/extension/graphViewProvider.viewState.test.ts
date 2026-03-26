import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../src/shared/contracts';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;

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
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn((section?: string) => {
        if (section === 'codegraphy.physics') {
          return createConfiguration({});
        }
        return createConfiguration({});
      });
    (vscode.workspace as unknown as { asRelativePath: ReturnType<typeof vi.fn> }).asRelativePath =
      vi.fn((uri: vscode.Uri) => uri.fsPath.replace('/test/workspace/', ''));
    vi.clearAllMocks();
  });

  it('warns and skips unavailable view changes', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.changeView('codegraphy.depth-graph');

    expect(warnSpy).toHaveBeenCalledWith("[CodeGraphy] View 'codegraphy.depth-graph' is not available");
    expect(context.workspaceState.update).not.toHaveBeenCalled();
    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it('persists and broadcasts available view changes when a target view is available', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    provider.setFocusedFile('src/app.ts');
    const applySpy = vi.spyOn(
      provider as unknown as { _applyViewTransform: () => void },
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendViewsSpy = vi.spyOn(
      provider as unknown as { _sendAvailableViews: () => void },
      '_sendAvailableViews'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.changeView('codegraphy.depth-graph');

    expect((provider as unknown as { _activeViewId: string })._activeViewId).toBe(
      'codegraphy.depth-graph'
    );
    expect(context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.selectedView',
      'codegraphy.depth-graph'
    );
    expect(applySpy).toHaveBeenCalledTimes(1);
    expect(sendViewsSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });

  it('clamps depth limits and re-sends graph data when the depth graph is active', async () => {
    const context = createContext();
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      context as unknown as vscode.ExtensionContext
    );
    (provider as unknown as { _activeViewId: string })._activeViewId = 'codegraphy.depth-graph';
    const applySpy = vi.spyOn(
      provider as unknown as { _applyViewTransform: () => void },
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.setDepthLimit(99);

    expect((provider as unknown as { _viewContext: { depthLimit: number } })._viewContext.depthLimit).toBe(10);
    expect(context.workspaceState.update).toHaveBeenCalledWith('codegraphy.depthLimit', 10);
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
    const applySpy = vi.spyOn(
      provider as unknown as { _applyViewTransform: () => void },
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    await provider.setDepthLimit(0);

    expect((provider as unknown as { _viewContext: { depthLimit: number } })._viewContext.depthLimit).toBe(1);
    expect(context.workspaceState.update).toHaveBeenCalledWith('codegraphy.depthLimit', 1);
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
          folderNodeColor: '#112233',
          showLabels: false,
        })
      );

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    (provider as unknown as { _sendSettings: () => void })._sendSettings();

    expect((provider as unknown as { _viewContext: { folderNodeColor: string } })._viewContext.folderNodeColor).toBe(
      '#112233'
    );
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
      type: 'FOLDER_NODE_COLOR_UPDATED',
      payload: { folderNodeColor: '#112233' },
    });
    expect(sendMessageSpy).toHaveBeenNthCalledWith(4, {
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
  });

  it('sends physics settings from configuration', () => {
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn((section?: string) => {
        if (section === 'codegraphy.physics') {
          return createConfiguration({
            repelForce: 14,
            linkDistance: 90,
            linkForce: 0.25,
            damping: 0.6,
            centerForce: 0.2,
          });
        }
        return createConfiguration({});
      });

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    (provider as unknown as { _sendPhysicsSettings: () => void })._sendPhysicsSettings();

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

    expect(
      (provider as unknown as { _getPluginDefaultGroups: () => unknown[] })._getPluginDefaultGroups()
    ).toEqual([]);
  });

  it('rebuilds graph data and notifies dependents when analyzer state is available', () => {
    (vscode.workspace as unknown as { getConfiguration: ReturnType<typeof vi.fn> }).getConfiguration =
      vi.fn(() => createConfiguration({ showOrphans: false }));

    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
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
      provider as unknown as { _updateViewContext: () => void },
      '_updateViewContext'
    ).mockImplementation(() => {});
    const applySpy = vi.spyOn(
      provider as unknown as { _applyViewTransform: () => void },
      '_applyViewTransform'
    ).mockImplementation(() => {});
    const sendViewsSpy = vi.spyOn(
      provider as unknown as { _sendAvailableViews: () => void },
      '_sendAvailableViews'
    ).mockImplementation(() => {});
    const sendStatusesSpy = vi.spyOn(
      provider as unknown as { _sendPluginStatuses: () => void },
      '_sendPluginStatuses'
    ).mockImplementation(() => {});
    const sendDecorationsSpy = vi.spyOn(
      provider as unknown as { _sendDecorations: () => void },
      '_sendDecorations'
    ).mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(
      provider as unknown as { _sendMessage: (message: unknown) => void },
      '_sendMessage'
    ).mockImplementation(() => {});

    (provider as unknown as { _rebuildAndSend: () => void })._rebuildAndSend();

    expect(rebuildGraph).toHaveBeenCalledWith(new Set(), new Set(), false);
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
    const panelWebview = { options: {}, asWebviewUri: vi.fn((uri: vscode.Uri) => uri) };
    (provider as unknown as {
      _view?: unknown;
      _panels: Array<{ webview: typeof panelWebview }>;
    })._panels = [{ webview: panelWebview }];

    (provider as unknown as { _refreshWebviewResourceRoots: () => void })._refreshWebviewResourceRoots();

    expect(
      (panelWebview.options as { localResourceRoots?: Array<{ fsPath: string }> }).localResourceRoots?.some(
        (uri) => uri.fsPath === '/test/extension'
      )
    ).toBe(true);
  });
});
