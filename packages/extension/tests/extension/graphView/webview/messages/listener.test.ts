import { describe, expect, it, vi } from 'vitest';
import type { NodeSizeMode } from '../../../../../src/shared/settings/modes';
import type { IGraphData } from '../../../../../src/shared/graph/types';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import type { IViewContext } from '../../../../../src/core/views/contracts';
import {
  setGraphViewWebviewMessageListener,
  type GraphViewMessageListenerContext,
} from '../../../../../src/extension/graphView/webview/messages/listener';

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
    resetTimeline: vi.fn(() => Promise.resolve()),
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
    getNodeSizeMode: vi.fn(() => 'connections' as NodeSizeMode),
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

  it('recomputes and sends groups after storing user group updates', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const userGroups: IGroup[] = [{ id: 'user:docs', pattern: 'docs/**', color: '#445566' }];
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    await messageHandler?.({ type: 'UPDATE_GROUPS', payload: { groups: userGroups } });

    expect(context.setUserGroups).toHaveBeenCalledWith(userGroups);
    expect(context.recomputeGroups).toHaveBeenCalledTimes(1);
    expect(context.sendGroupsUpdated).toHaveBeenCalledTimes(1);
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

  it('ignores duplicate WEBVIEW_READY messages from the same listener', async () => {
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
    await messageHandler?.({ type: 'WEBVIEW_READY' });

    expect(context.analyzeAndSendData).toHaveBeenCalledTimes(1);
    expect(context.loadGroupsAndFilterPatterns).toHaveBeenCalledTimes(1);
    expect(context.loadDisabledRulesAndPlugins).toHaveBeenCalledTimes(1);
    expect(context.notifyWebviewReady).toHaveBeenCalledTimes(1);
    expect(context.setWebviewReadyNotified).toHaveBeenCalledWith(true);
    expect(context.setWebviewReadyNotified).toHaveBeenCalledTimes(1);
  });

  it('replaces the previous listener when the same webview is wired again', async () => {
    const activeHandlers = new Set<(message: unknown) => Promise<void>>();
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        activeHandlers.add(handler);
        return {
          dispose: () => {
            activeHandlers.delete(handler);
          },
        };
      }),
    };
    const context = createContext();

    setGraphViewWebviewMessageListener(webview as never, context);
    setGraphViewWebviewMessageListener(webview as never, context);

    expect(activeHandlers.size).toBe(1);

    await Promise.all(
      [...activeHandlers].map(handler => handler({ type: 'REFRESH_GRAPH' })),
    );

    expect(context.analyzeAndSendData).toHaveBeenCalledTimes(1);
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
