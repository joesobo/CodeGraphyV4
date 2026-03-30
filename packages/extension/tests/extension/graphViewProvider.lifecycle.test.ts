import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../src/shared/graph/types';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from './graphViewProvider/internals';

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
    const internals = getGraphViewProviderInternals(provider);
    const sendDecorationsSpy = vi.spyOn(internals._pluginMethods, '_sendDecorations');

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
    const internals = getGraphViewProviderInternals(provider);

    const loadSpy = vi
      .spyOn(internals._settingsStateMethods, '_loadDisabledRulesAndPlugins')
      .mockReturnValue(true);
    const analyzeSpy = vi
      .spyOn(internals._analysisMethods, '_analyzeAndSendData')
      .mockResolvedValue();
    const settingsSpy = vi
      .spyOn(internals._settingsStateMethods, '_sendSettings')
      .mockImplementation(() => {});
    const physicsSpy = vi
      .spyOn(internals._physicsSettingsMethods, '_sendPhysicsSettings')
      .mockImplementation(() => {});

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
    const analyzeSpy = vi
      .spyOn(internals._analysisMethods, '_analyzeAndSendData')
      .mockResolvedValue();

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
    const internals = getGraphViewProviderInternals(provider);
    const sendMessageSpy = vi
      .spyOn(internals._webviewMethods, '_sendMessage')
      .mockImplementation(() => {});
    const sendAvailableViewsSpy = vi
      .spyOn(internals._viewContextMethods, '_sendAvailableViews')
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
    expect(sendAvailableViewsSpy).toHaveBeenCalledTimes(1);
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
    const sendAvailableViewsSpy = vi
      .spyOn(internals._viewContextMethods, '_sendAvailableViews')
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
    expect(sendAvailableViewsSpy).toHaveBeenCalledTimes(1);
  });

  it('clearCacheAndRefresh still analyzes when there is no analyzer cache to clear', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const analyzeSpy = vi
      .spyOn(internals._analysisMethods, '_analyzeAndSendData')
      .mockResolvedValue();

    (provider as unknown as { _analyzer?: unknown })._analyzer = undefined;

    await provider.clearCacheAndRefresh();

    expect(analyzeSpy).toHaveBeenCalledTimes(1);
  });
});
