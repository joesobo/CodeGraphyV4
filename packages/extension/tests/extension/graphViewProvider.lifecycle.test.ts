import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { IGraphData } from '../../src/shared/graph/contracts';
import { GraphViewProvider } from '../../src/extension/graphViewProvider';
import { getGraphViewProviderInternals } from './graphViewProvider/internals';
import {
  getWorkspaceAnalysisDatabasePath,
  readWorkspaceAnalysisDatabaseSnapshot,
} from '../../src/extension/pipeline/database/cache/storage';
import { waitForWorkspacePipelineCachePersistence } from '../../src/extension/pipeline/service/cache/storage';

let workspaceFoldersValue:
  | Array<{ uri: { fsPath: string; path: string }; name: string; index: number }>
  | undefined;
const tempWorkspaceRoots: string[] = [];

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

async function createWorkspace(files: Record<string, string>): Promise<string> {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-provider-'));
  tempWorkspaceRoots.push(workspaceRoot);

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, 'utf8');
  }

  return workspaceRoot;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.stat(filePath);
    return true;
  } catch {
    return false;
  }
}

describe('GraphViewProvider lifecycle', () => {
  beforeEach(() => {
    workspaceFoldersValue = [
      { uri: vscode.Uri.file('/test/workspace'), name: 'workspace', index: 0 },
    ];
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await Promise.all(
      tempWorkspaceRoots.splice(0).map((workspaceRoot) =>
        fs.rm(workspaceRoot, { recursive: true, force: true }),
      ),
    );
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
    vi.spyOn(internals._fileInfoMethods, '_sendFavorites').mockImplementation(() => {});

    (provider as unknown as {
      _analyzer: { clearCache: () => void };
    })._analyzer = { clearCache };

    await provider.clearCacheAndRefresh();

    expect(clearCache).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('recreates the Graph Cache and Tree-sitter edges after a deleted cache is refreshed then indexed', async () => {
    const workspaceRoot = await createWorkspace({
      'src/utils.ts': 'export const value = 1;\n',
      'src/index.ts': "import { value } from './utils';\nconsole.log(value);\n",
    });
    workspaceFoldersValue = [
      { uri: vscode.Uri.file(workspaceRoot), name: 'workspace', index: 0 },
    ];
    const provider = new GraphViewProvider(
      vscode.Uri.file('/test/extension'),
      createContext() as unknown as vscode.ExtensionContext
    );
    const databasePath = getWorkspaceAnalysisDatabasePath(workspaceRoot);

    await provider.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
    await waitForWorkspacePipelineCachePersistence(workspaceRoot);
    expect(provider.getGraphData().edges.map(edge => edge.id)).toContain('src/index.ts->src/utils.ts#import');
    expect(await pathExists(databasePath)).toBe(true);

    await fs.unlink(databasePath);
    await provider.dispatchWebviewMessage({ type: 'WEBVIEW_READY', payload: null });
    expect(provider.getGraphData().edges).toEqual([]);
    expect(await pathExists(databasePath)).toBe(false);

    await provider.dispatchWebviewMessage({ type: 'INDEX_GRAPH' });
    await waitForWorkspacePipelineCachePersistence(workspaceRoot);

    expect(provider.getGraphData().edges.map(edge => edge.id)).toContain('src/index.ts->src/utils.ts#import');
    expect(await pathExists(databasePath)).toBe(true);
    expect(readWorkspaceAnalysisDatabaseSnapshot(workspaceRoot).relations.length).toBeGreaterThan(0);
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
