import { describe, expect, it, vi } from 'vitest';
import type { IGraphData, IGroup } from '../../../../src/shared/types';
import type { IViewContext } from '../../../../src/core/views';
import {
  setGraphViewWebviewMessageListener,
  type GraphViewMessageListenerContext,
} from '../../../../src/extension/graphView/messages/listener';

function createContext(
  overrides: Partial<GraphViewMessageListenerContext> = {},
): GraphViewMessageListenerContext {
  return {
    getTimelineActive: vi.fn(() => false),
    getCurrentCommitSha: vi.fn(() => undefined),
    getUserGroups: vi.fn(() => []),
    getActiveViewId: vi.fn(() => 'codegraphy.connections'),
    getDisabledPlugins: vi.fn(() => new Set<string>()),
    getDisabledRules: vi.fn(() => new Set<string>()),
    getFilterPatterns: vi.fn(() => []),
    getGraphData: vi.fn(() => ({ nodes: [], edges: [] } satisfies IGraphData)),
    getViewContext: vi.fn(() => ({ activePlugins: new Set() } satisfies IViewContext)),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    previewFileAtCommit: vi.fn(() => Promise.resolve()),
    openFile: vi.fn(() => Promise.resolve()),
    revealInExplorer: vi.fn(() => Promise.resolve()),
    copyToClipboard: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    toggleFavorites: vi.fn(() => Promise.resolve()),
    addToExclude: vi.fn(() => Promise.resolve()),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
    getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve(undefined)),
    redo: vi.fn(() => Promise.resolve(undefined)),
    showInformationMessage: vi.fn(),
    changeView: vi.fn(() => Promise.resolve()),
    setDepthLimit: vi.fn(() => Promise.resolve()),
    updateDagMode: vi.fn(() => Promise.resolve()),
    updateNodeSizeMode: vi.fn(() => Promise.resolve()),
    indexRepository: vi.fn(() => Promise.resolve()),
    jumpToCommit: vi.fn(() => Promise.resolve()),
    sendPhysicsSettings: vi.fn(),
    updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    workspaceFolder: undefined,
    persistGroups: vi.fn(() => Promise.resolve()),
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    createDirectory: vi.fn(() => Promise.resolve()),
    copyFile: vi.fn(() => Promise.resolve()),
    getConfig: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
    updateConfig: vi.fn(() => Promise.resolve()),
    getPluginFilterPatterns: vi.fn(() => []),
    sendMessage: vi.fn(),
    applyViewTransform: vi.fn(),
    smartRebuild: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    getMaxFiles: vi.fn(() => 500),
    getPlaybackSpeed: vi.fn(() => 1),
    getDagMode: vi.fn(() => null),
    getNodeSizeMode: vi.fn(() => 'connections'),
    getFolderNodeColor: vi.fn(() => '#111111'),
    hasWorkspace: vi.fn(() => false),
    isFirstAnalysis: vi.fn(() => false),
    isWebviewReadyNotified: vi.fn(() => false),
    getHiddenPluginGroupIds: vi.fn(() => new Set<string>()),
    loadGroupsAndFilterPatterns: vi.fn(),
    loadDisabledRulesAndPlugins: vi.fn(),
    sendFavorites: vi.fn(),
    sendSettings: vi.fn(),
    sendCachedTimeline: vi.fn(),
    sendDecorations: vi.fn(),
    sendContextMenuItems: vi.fn(),
    sendPluginWebviewInjections: vi.fn(),
    waitForFirstWorkspaceReady: vi.fn(() => Promise.resolve()),
    notifyWebviewReady: vi.fn(),
    getInteractionPluginApi: vi.fn(),
    getContextMenuPluginApi: vi.fn(),
    emitEvent: vi.fn(),
    findNode: vi.fn(),
    findEdge: vi.fn(),
    logError: vi.fn(),
    updateHiddenPluginGroups: vi.fn(() => Promise.resolve()),
    setUserGroups: vi.fn(),
    setFilterPatterns: vi.fn(),
    setWebviewReadyNotified: vi.fn(),
    ...overrides,
  };
}

describe('graph view webview message listener', () => {
  it('stores user group updates from primary dispatch flows', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const userGroups: IGroup[] = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'UPDATE_GROUPS', payload: { groups: userGroups } });

    expect(context.setUserGroups).toHaveBeenCalledWith(userGroups);
    expect(context.setFilterPatterns).not.toHaveBeenCalled();
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });

  it('stores filter pattern updates from primary dispatch flows', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({
      type: 'UPDATE_FILTER_PATTERNS',
      payload: { patterns: ['dist/**'] },
    });

    expect(context.setFilterPatterns).toHaveBeenCalledWith(['dist/**']);
    expect(context.setUserGroups).not.toHaveBeenCalled();
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });

  it('stores ready state updates from plugin dispatch flows', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'WEBVIEW_READY' });

    expect(context.setWebviewReadyNotified).toHaveBeenCalledWith(true);
  });

  it('does not store ready state for handled plugin messages without a ready flag', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({
      type: 'GRAPH_INTERACTION',
      payload: {
        event: 'nodeClick',
        data: { pluginId: 'plugin.test', nodeId: 'src/index.ts' },
      },
    });

    expect(context.emitEvent).toHaveBeenCalledWith('nodeClick', {
      pluginId: 'plugin.test',
      nodeId: 'src/index.ts',
    });
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });

  it('ignores messages not handled by the primary or plugin dispatchers', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'NOT_A_REAL_MESSAGE' } as never);

    expect(context.setUserGroups).not.toHaveBeenCalled();
    expect(context.setFilterPatterns).not.toHaveBeenCalled();
    expect(context.setWebviewReadyNotified).not.toHaveBeenCalled();
  });
});
