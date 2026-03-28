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

function createContext(savedViewId?: string) {
  return {
    subscriptions: [],
    extensionUri: vscode.Uri.file('/test/extension'),
    workspaceState: {
      get: vi.fn((key: string) => {
        if (key === 'codegraphy.selectedView') {
          return savedViewId;
        }
        return undefined;
      }),
      update: vi.fn(() => Promise.resolve()),
    },
  };
}

describe('GraphViewProvider lifecycle', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('falls back to the default view when the saved view id is unavailable', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext('missing.view') as unknown as vscode.ExtensionContext
    );

    expect((provider as unknown as {
      _activeViewId: string;
      _viewRegistry: { getDefaultViewId: () => string | undefined };
    })._activeViewId).toBe('codegraphy.connections');
  });

  it('forwards decoration manager change notifications to _sendDecorations', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const sendDecorationsSpy = vi.spyOn((provider as unknown as {
      _sendDecorations: () => void;
    }), '_sendDecorations');

    (provider as unknown as {
      _decorationManager: {
        decorateNode: (pluginId: string, nodeId: string, decoration: { color: string }) => unknown;
      };
    })._decorationManager.decorateNode('plugin.test', 'src/index.ts', { color: '#ff0000' });

    expect(sendDecorationsSpy).toHaveBeenCalledTimes(1);
  });

  it('refresh re-analyzes and sends both settings payloads', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const providerPrivate = provider as unknown as {
      _analyzeAndSendData: () => Promise<void>;
      _loadDisabledRulesAndPlugins: () => boolean;
      _sendPhysicsSettings: () => void;
      _sendSettings: () => void;
    };

    const loadSpy = vi.spyOn(providerPrivate, '_loadDisabledRulesAndPlugins').mockReturnValue(true);
    const analyzeSpy = vi.spyOn(providerPrivate, '_analyzeAndSendData').mockResolvedValue();
    const settingsSpy = vi.spyOn(providerPrivate, '_sendSettings').mockImplementation(() => {});
    const physicsSpy = vi.spyOn(providerPrivate, '_sendPhysicsSettings').mockImplementation(() => {});

    await provider.refresh();

    expect(loadSpy).toHaveBeenCalledTimes(1);
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
    expect(settingsSpy).toHaveBeenCalledTimes(1);
    expect(physicsSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshToggleSettings only rebuilds when toggle state changed', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const providerPrivate = provider as unknown as {
      _loadDisabledRulesAndPlugins: () => boolean;
      _rebuildAndSend: () => void;
    };

    vi.spyOn(providerPrivate, '_loadDisabledRulesAndPlugins').mockReturnValue(false);
    const rebuildSpy = vi.spyOn(providerPrivate, '_rebuildAndSend').mockImplementation(() => {});

    provider.refreshToggleSettings();

    expect(rebuildSpy).not.toHaveBeenCalled();

    vi.spyOn(providerPrivate, '_loadDisabledRulesAndPlugins').mockReturnValue(true);
    provider.refreshToggleSettings();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
  });

  it('clearCacheAndRefresh clears analyzer cache before analyzing', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const clearCache = vi.fn();
    const analyzeSpy = vi.spyOn((provider as unknown as {
      _analyzeAndSendData: () => Promise<void>;
    }), '_analyzeAndSendData').mockResolvedValue();

    (provider as unknown as {
      _analyzer: { clearCache: () => void };
    })._analyzer = { clearCache };

    await provider.clearCacheAndRefresh();

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });

  it('sends empty graph data when _doAnalyzeAndSendData runs without an analyzer', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const providerPrivate = provider as unknown as {
      _analysisRequestId: number;
      _sendMessage: (message: unknown) => void;
      _sendAvailableViews: () => void;
      _doAnalyzeAndSendData: (signal: AbortSignal, requestId: number) => Promise<void>;
    };
    const sendMessageSpy = vi.spyOn(providerPrivate, '_sendMessage').mockImplementation(() => {});
    const sendAvailableViewsSpy = vi
      .spyOn(providerPrivate, '_sendAvailableViews')
      .mockImplementation(() => {});

    (provider as unknown as { _analyzer?: unknown })._analyzer = undefined;
    providerPrivate._analysisRequestId = 1;

    await providerPrivate._doAnalyzeAndSendData(new AbortController().signal, 1);

    expect((provider as unknown as { _rawGraphData: IGraphData })._rawGraphData).toEqual({
      nodes: [],
      edges: [],
    });
    expect((provider as unknown as { _graphData: IGraphData })._graphData).toEqual({
      nodes: [],
      edges: [],
    });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(sendAvailableViewsSpy).toHaveBeenCalledTimes(1);
  });

  it('sends empty graph data when _doAnalyzeAndSendData has no workspace', async () => {
    workspaceFoldersValue = undefined;
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const providerPrivate = provider as unknown as {
      _analysisRequestId: number;
      _sendMessage: (message: unknown) => void;
      _sendAvailableViews: () => void;
      _computeMergedGroups: () => void;
      _sendGroupsUpdated: () => void;
      _doAnalyzeAndSendData: (signal: AbortSignal, requestId: number) => Promise<void>;
    };
    const sendMessageSpy = vi.spyOn(providerPrivate, '_sendMessage').mockImplementation(() => {});
    const sendAvailableViewsSpy = vi
      .spyOn(providerPrivate, '_sendAvailableViews')
      .mockImplementation(() => {});
    vi.spyOn(providerPrivate, '_computeMergedGroups').mockImplementation(() => {});
    vi.spyOn(providerPrivate, '_sendGroupsUpdated').mockImplementation(() => {});

    (provider as unknown as {
      _analyzer: { analyze: () => Promise<IGraphData> };
      _analyzerInitialized: boolean;
    })._analyzer = { analyze: vi.fn() };
    (provider as unknown as { _analyzerInitialized: boolean })._analyzerInitialized = true;
    providerPrivate._analysisRequestId = 1;

    await providerPrivate._doAnalyzeAndSendData(new AbortController().signal, 1);

    expect((provider as unknown as { _rawGraphData: IGraphData })._rawGraphData).toEqual({
      nodes: [],
      edges: [],
    });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(sendAvailableViewsSpy).toHaveBeenCalledTimes(1);
  });

  it('clearCacheAndRefresh still analyzes when there is no analyzer cache to clear', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const analyzeSpy = vi.spyOn((provider as unknown as {
      _analyzeAndSendData: () => Promise<void>;
    }), '_analyzeAndSendData').mockResolvedValue();

    (provider as unknown as { _analyzer?: unknown })._analyzer = undefined;

    await provider.clearCacheAndRefresh();

    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });
});
