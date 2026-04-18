import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../src/shared/graph/contracts';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from './graphViewProvider/internals';

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

describe('GraphViewProvider lifecycle', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('forwards decoration manager change notifications to _sendDecorations', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendDecorationsSpy = vi.spyOn(internals._pluginMethods, '_sendDecorations');

    (provider as unknown as {
      _decorationManager: {
        decorateNode: (pluginId: string, nodeId: string, decoration: { color: string }) => unknown;
      };
    })._decorationManager.decorateNode('plugin.test', 'src/index.ts', { color: '#ff0000' });

    expect(sendDecorationsSpy).toHaveBeenCalledTimes(1);
  });

  it('refresh reloads persisted settings, re-analyzes, and resends the full settings snapshot', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);

    const refreshSpy = vi
      .spyOn(internals._refreshMethods, 'refresh')
      .mockResolvedValue();

    await provider.refresh();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('refreshToggleSettings only rebuilds when toggle state changed', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);

    vi.spyOn(internals._settingsStateMethods, '_loadDisabledRulesAndPlugins').mockReturnValue(false);
    const rebuildSpy = vi
      .spyOn(internals._refreshMethods, '_rebuildAndSend')
      .mockImplementation(() => {});

    provider.refreshToggleSettings();

    expect(rebuildSpy).not.toHaveBeenCalled();

    vi.spyOn(internals._settingsStateMethods, '_loadDisabledRulesAndPlugins').mockReturnValue(true);
    provider.refreshToggleSettings();

    expect(rebuildSpy).toHaveBeenCalledTimes(1);
  });

  it('clearCacheAndRefresh clears analyzer cache before analyzing', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const clearCache = vi.fn();
    const internals = getGraphViewProviderInternals(provider);
    const refreshSpy = vi
      .spyOn(internals._analysisMethods, '_refreshAndSendData')
      .mockResolvedValue();
    vi.spyOn(internals._settingsStateMethods, '_sendAllSettings').mockImplementation(() => {});
    vi.spyOn(internals._fileVisitMethods, '_sendFavorites').mockImplementation(() => {});

    (provider as unknown as {
      _analyzer: { clearCache: () => void };
    })._analyzer = { clearCache };

    await provider.clearCacheAndRefresh();

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('sends empty graph data when _doAnalyzeAndSendData runs without an analyzer', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendMessageSpy = vi
      .spyOn(internals._webviewMethods, '_sendMessage')
      .mockImplementation(() => {});
    const sendDepthStateSpy = vi
      .spyOn(internals._viewContextMethods, '_sendDepthState')
      .mockImplementation(() => {});

    (provider as unknown as { _analyzer?: unknown })._analyzer = undefined;
    (provider as unknown as { _analysisRequestId: number })._analysisRequestId = 1;

    await internals._analysisMethods._doAnalyzeAndSendData(new AbortController().signal, 1);

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
    expect(sendDepthStateSpy).toHaveBeenCalledTimes(1);
  });

  it('sends empty graph data when _doAnalyzeAndSendData has no workspace', async () => {
    workspaceFoldersValue = undefined;
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const sendMessageSpy = vi
      .spyOn(internals._webviewMethods, '_sendMessage')
      .mockImplementation(() => {});
    const sendDepthStateSpy = vi
      .spyOn(internals._viewContextMethods, '_sendDepthState')
      .mockImplementation(() => {});
    vi.spyOn(internals._pluginResourceMethods, '_computeMergedGroups').mockImplementation(() => {});
    vi.spyOn(internals._pluginMethods, '_sendGroupsUpdated').mockImplementation(() => {});

    (provider as unknown as {
      _analyzer: { analyze: () => Promise<IGraphData> };
      _analyzerInitialized: boolean;
    })._analyzer = { analyze: vi.fn() };
    (provider as unknown as { _analyzerInitialized: boolean })._analyzerInitialized = true;
    (provider as unknown as { _analysisRequestId: number })._analysisRequestId = 1;

    await internals._analysisMethods._doAnalyzeAndSendData(new AbortController().signal, 1);

    expect((provider as unknown as { _rawGraphData: IGraphData })._rawGraphData).toEqual({
      nodes: [],
      edges: [],
    });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(sendDepthStateSpy).toHaveBeenCalledTimes(1);
  });

  it('clearCacheAndRefresh still analyzes when there is no analyzer cache to clear', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const refreshSpy = vi
      .spyOn(internals._analysisMethods, '_refreshAndSendData')
      .mockResolvedValue();

    (provider as unknown as { _analyzer?: unknown })._analyzer = undefined;

    await provider.clearCacheAndRefresh();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });
});
