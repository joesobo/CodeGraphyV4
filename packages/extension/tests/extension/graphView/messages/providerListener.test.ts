import { describe, expect, it, vi } from 'vitest';
import type { IGraphData, IGroup } from '../../../../src/shared/types';
import type { IViewContext } from '../../../../src/core/views';
import {
  setGraphViewProviderMessageListener,
  type GraphViewProviderMessageListenerDependencies,
  type GraphViewProviderMessageListenerSource,
} from '../../../../src/extension/graphView/messages/providerListener';

function createDependencies(): GraphViewProviderMessageListenerDependencies {
  const configuration = {
    get: vi.fn(<T>(_key: string, defaultValue: T) => defaultValue),
    update: vi.fn(() => Promise.resolve()),
  };

  return {
    workspace: {
      workspaceFolders: undefined,
      getConfiguration: vi.fn(() => configuration),
    },
    window: {
      showInformationMessage: vi.fn(),
      showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    },
    getConfigTarget: vi.fn(() => 'workspace'),
    captureSettingsSnapshot: vi.fn(() => ({}) as never),
    createResetSettingsAction: vi.fn(() => ({ kind: 'reset-settings-action' })),
    executeUndoAction: vi.fn(() => Promise.resolve()),
    normalizeFolderNodeColor: vi.fn(color => color),
    defaultFolderNodeColor: '#336699',
    dagModeKey: 'dag-mode',
    nodeSizeModeKey: 'node-size-mode',
  };
}

function createSource(
  overrides: Partial<GraphViewProviderMessageListenerSource> = {},
): GraphViewProviderMessageListenerSource {
  return {
    _timelineActive: false,
    _currentCommitSha: undefined,
    _userGroups: [],
    _activeViewId: 'codegraphy.connections',
    _disabledPlugins: new Set<string>(),
    _disabledRules: new Set<string>(),
    _filterPatterns: ['dist/**'],
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _viewContext: { activePlugins: new Set() } satisfies IViewContext,
    _dagMode: null,
    _nodeSizeMode: 'connections',
    _firstAnalysis: false,
    _webviewReadyNotified: false,
    _hiddenPluginGroupIds: new Set<string>(),
    _context: {
      workspaceState: {
        update: vi.fn(() => Promise.resolve()),
      },
    } as never,
    _analyzer: {
      getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
      registry: {
        notifyWebviewReady: vi.fn(),
        getPluginAPI: vi.fn(),
      },
    } as never,
    _eventBus: {
      emit: vi.fn(),
    } as never,
    _firstWorkspaceReadyPromise: Promise.resolve(),
    _getPhysicsSettings: vi.fn(() => ({
      repelForce: 1,
      linkDistance: 2,
      linkForce: 3,
      damping: 4,
      centerForce: 5,
    })),
    _openSelectedNode: vi.fn(() => Promise.resolve()),
    _activateNode: vi.fn(() => Promise.resolve()),
    _previewFileAtCommit: vi.fn(() => Promise.resolve()),
    _openFile: vi.fn(() => Promise.resolve()),
    _revealInExplorer: vi.fn(() => Promise.resolve()),
    _copyToClipboard: vi.fn(() => Promise.resolve()),
    _deleteFiles: vi.fn(() => Promise.resolve()),
    _renameFile: vi.fn(() => Promise.resolve()),
    _createFile: vi.fn(() => Promise.resolve()),
    _toggleFavorites: vi.fn(() => Promise.resolve()),
    _addToExclude: vi.fn(() => Promise.resolve()),
    _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    _getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve(undefined)),
    redo: vi.fn(() => Promise.resolve(undefined)),
    changeView: vi.fn(() => Promise.resolve()),
    setDepthLimit: vi.fn(() => Promise.resolve()),
    _indexRepository: vi.fn(() => Promise.resolve()),
    _jumpToCommit: vi.fn(() => Promise.resolve()),
    _sendPhysicsSettings: vi.fn(),
    _updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    _resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendMessage: vi.fn(),
    _applyViewTransform: vi.fn(),
    _smartRebuild: vi.fn(),
    _sendAllSettings: vi.fn(),
    _loadGroupsAndFilterPatterns: vi.fn(),
    _loadDisabledRulesAndPlugins: vi.fn(() => false),
    _sendFavorites: vi.fn(),
    _sendSettings: vi.fn(),
    _sendCachedTimeline: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendContextMenuItems: vi.fn(),
    _sendPluginWebviewInjections: vi.fn(),
    ...overrides,
  };
}

describe('graph view provider listener bridge', () => {
  it('stores updated user groups back onto the provider source', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const deps = createDependencies();
    const source = createSource();
    const userGroups: IGroup[] = [{ id: 'user:src', pattern: 'src/**', color: '#112233' }];

    setGraphViewProviderMessageListener(webview as never, source, deps);
    await messageHandler?.({ type: 'UPDATE_GROUPS', payload: { groups: userGroups } });

    expect(source._userGroups).toEqual(userGroups);
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
  });

  it('stores ready state updates back onto the provider source', async () => {
    let messageHandler: ((message: unknown) => Promise<void>) | undefined;
    const webview = {
      onDidReceiveMessage: vi.fn((handler: (message: unknown) => Promise<void>) => {
        messageHandler = handler;
        return { dispose: () => {} };
      }),
    };
    const deps = createDependencies();
    const source = createSource();

    setGraphViewProviderMessageListener(webview as never, source, deps);
    await messageHandler?.({ type: 'WEBVIEW_READY', payload: null });

    expect(source._webviewReadyNotified).toBe(true);
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
    expect(source._sendPhysicsSettings).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._sendCachedTimeline).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(source._sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(source._analyzer?.registry?.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: { patterns: ['dist/**'], pluginPatterns: ['plugin/**'] },
    });
  });
});
