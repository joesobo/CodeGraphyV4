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

describe('GraphViewProvider error handling', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  it('logs unexpected analysis errors and clears the active controller', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    vi.spyOn(internals._analysisMethods, '_doAnalyzeAndSendData').mockRejectedValueOnce(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await internals._analysisMethods._analyzeAndSendData();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[CodeGraphy] Analysis failed:', expect.any(Error));
    expect((provider as unknown as { _analysisController?: AbortController })._analysisController).toBeUndefined();
  });

  it('sends empty graph data when workspace analysis throws a non-abort error', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    (provider as unknown as { _analysisRequestId: number })._analysisRequestId = 1;
    (provider as unknown as { _analyzerInitialized: boolean })._analyzerInitialized = true;
    (provider as unknown as {
      _analyzer: {
        analyze: () => Promise<IGraphData>;
        registry: { list(): unknown[]; notifyPostAnalyze(graph: IGraphData): void };
      };
    })._analyzer = {
      analyze: vi.fn().mockRejectedValueOnce(new Error('analysis failed')),
      registry: {
        list: () => [],
        notifyPostAnalyze: () => {},
      },
    };
    vi.spyOn(internals._pluginResourceMethods, '_computeMergedGroups').mockImplementation(() => {});
    vi.spyOn(internals._pluginMethods, '_sendGroupsUpdated').mockImplementation(() => {});
    const sendMessageSpy = vi
      .spyOn(internals._webviewMethods, '_sendMessage')
      .mockImplementation(() => {});
    const sendDepthStateSpy = vi
      .spyOn(internals._viewContextMethods, '_sendDepthState')
      .mockImplementation(() => {});
    const sendPluginStatusesSpy = vi
      .spyOn(internals._pluginMethods, '_sendPluginStatuses')
      .mockImplementation(() => {});
    const sendPluginExportersSpy = vi
      .spyOn(internals._pluginMethods, '_sendPluginExporters')
      .mockImplementation(() => {});
    const markWorkspaceReadySpy = vi
      .spyOn(internals._analysisMethods, '_markWorkspaceReady')
      .mockImplementation(() => {});

    await internals._analysisMethods._doAnalyzeAndSendData(new AbortController().signal, 1);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[CodeGraphy] Analysis failed:', expect.any(Error));
    expect((provider as unknown as { _graphData: IGraphData })._graphData).toEqual({ nodes: [], edges: [] });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(sendDepthStateSpy).toHaveBeenCalledTimes(1);
    expect(sendPluginStatusesSpy).toHaveBeenCalledTimes(1);
    expect(sendPluginExportersSpy).toHaveBeenCalledTimes(1);
    expect(markWorkspaceReadySpy).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('recognizes abort errors without treating other errors as aborted', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const internals = getGraphViewProviderInternals(provider);
    const abortError = new Error('cancelled');
    abortError.name = 'AbortError';

    expect(internals._analysisMethods._isAbortError(abortError)).toBe(true);
    expect(internals._analysisMethods._isAbortError(new Error('boom'))).toBe(false);
    expect(internals._analysisMethods._isAbortError('AbortError')).toBe(false);
  });
});
