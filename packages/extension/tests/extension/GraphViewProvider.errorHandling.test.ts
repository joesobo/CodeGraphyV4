import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '../../src/shared/types';
import { GraphViewProvider } from '../../src/extension/GraphViewProvider';

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
    const providerPrivate = provider as unknown as {
      _analysisController?: AbortController;
      _analyzeAndSendData: () => Promise<void>;
      _doAnalyzeAndSendData: () => Promise<void>;
    };
    vi.spyOn(providerPrivate, '_doAnalyzeAndSendData').mockRejectedValueOnce(new Error('boom'));
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await providerPrivate._analyzeAndSendData();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[CodeGraphy] Analysis failed:', expect.any(Error));
    expect(providerPrivate._analysisController).toBeUndefined();
  });

  it('sends empty graph data when workspace analysis throws a non-abort error', async () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const providerPrivate = provider as unknown as {
      _analysisRequestId: number;
      _analyzerInitialized: boolean;
      _analyzer: { analyze: () => Promise<IGraphData> };
      _computeMergedGroups: () => void;
      _sendGroupsUpdated: () => void;
      _sendMessage: (message: unknown) => void;
      _sendAvailableViews: () => void;
      _sendPluginStatuses: () => void;
      _markWorkspaceReady: (graph: IGraphData) => void;
      _doAnalyzeAndSendData: (signal: AbortSignal, requestId: number) => Promise<void>;
      _graphData: IGraphData;
    };
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    providerPrivate._analysisRequestId = 1;
    providerPrivate._analyzerInitialized = true;
    providerPrivate._analyzer = {
      analyze: vi.fn().mockRejectedValueOnce(new Error('analysis failed')),
    };
    vi.spyOn(providerPrivate, '_computeMergedGroups').mockImplementation(() => {});
    vi.spyOn(providerPrivate, '_sendGroupsUpdated').mockImplementation(() => {});
    const sendMessageSpy = vi.spyOn(providerPrivate, '_sendMessage').mockImplementation(() => {});
    const sendAvailableViewsSpy = vi
      .spyOn(providerPrivate, '_sendAvailableViews')
      .mockImplementation(() => {});
    const sendPluginStatusesSpy = vi
      .spyOn(providerPrivate, '_sendPluginStatuses')
      .mockImplementation(() => {});
    const markWorkspaceReadySpy = vi
      .spyOn(providerPrivate, '_markWorkspaceReady')
      .mockImplementation(() => {});

    await providerPrivate._doAnalyzeAndSendData(new AbortController().signal, 1);

    expect(consoleErrorSpy).toHaveBeenCalledWith('[CodeGraphy] Analysis failed:', expect.any(Error));
    expect(providerPrivate._graphData).toEqual({ nodes: [], edges: [] });
    expect(sendMessageSpy).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
    expect(sendAvailableViewsSpy).toHaveBeenCalledTimes(1);
    expect(sendPluginStatusesSpy).toHaveBeenCalledTimes(1);
    expect(markWorkspaceReadySpy).toHaveBeenCalledWith({ nodes: [], edges: [] });
  });

  it('recognizes abort errors without treating other errors as aborted', () => {
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const providerPrivate = provider as unknown as {
      _isAbortError: (error: unknown) => boolean;
    };
    const abortError = new Error('cancelled');
    abortError.name = 'AbortError';

    expect(providerPrivate._isAbortError(abortError)).toBe(true);
    expect(providerPrivate._isAbortError(new Error('boom'))).toBe(false);
    expect(providerPrivate._isAbortError('AbortError')).toBe(false);
  });
});
