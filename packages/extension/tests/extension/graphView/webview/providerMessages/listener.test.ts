import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '@/shared/graph/types';
import type { IGroup } from '@/shared/settings/groups';
import type { DagMode, NodeSizeMode } from '@/shared/settings/modes';
import type { ISettingsSnapshot } from '../../../../../src/shared/settings/snapshot';
import type { IViewContext } from '@/core/views/contracts';
import type { IUndoableAction } from '../../../../../src/extension/undoManager';
import type { GraphViewMessageListenerContext } from '../../../../../src/extension/graphView/webview/messages/listener';
import {
  setGraphViewProviderMessageListener,
  type GraphViewProviderMessageListenerDependencies,
  type GraphViewProviderMessageListenerSource,
} from '../../../../../src/extension/graphView/webview/providerMessages/listener';

type MockUndoableAction = IUndoableAction & { kind?: string };

function createUndoableAction(overrides: Partial<MockUndoableAction> = {}): MockUndoableAction {
  return {
    description: 'test action',
    execute: vi.fn(async () => undefined),
    undo: vi.fn(async () => undefined),
    ...overrides,
  };
}

function createSettingsSnapshot(): ISettingsSnapshot {
  return {
    groups: [],
    filterPatterns: [],
    hiddenPluginGroups: [],
    showOrphans: true,
    bidirectionalMode: 'separate',
    directionMode: 'arrows',
    directionColor: '#123456',
    folderNodeColor: '#abcdef',
    nodeColors: { file: '#999999', folder: '#888888' },
    nodeVisibility: { file: true, folder: true },
    edgeVisibility: { imports: true, nests: false },
    edgeColors: { imports: '#777777', nests: '#666666' },
    pluginOrder: ['codegraphy.markdown', 'codegraphy.python'],
    disabledPlugins: ['codegraphy.python'],
    disabledSources: ['codegraphy.markdown:link'],
    particleSpeed: 0.005,
    particleSize: 4,
    showLabels: true,
    maxFiles: 500,
    nodeSizeMode: 'connections',
    physics: {
      repelForce: 1,
      linkDistance: 2,
      linkForce: 3,
      damping: 4,
      centerForce: 5,
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.doUnmock('vscode');
  vi.doUnmock('../../../../../src/extension/graphView/webview/messages/listener');
  vi.doUnmock('../../../../../src/extension/graphView/settings/reader');
  vi.doUnmock('../../../../../src/extension/graphView/settings/snapshot');
  vi.doUnmock('../../../../../src/extension/actions/resetSettings');
  vi.doUnmock('../../../../../src/extension/undoManager');
  vi.resetModules();
});

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
    getConfigTarget: vi.fn(() => vscode.ConfigurationTarget.Workspace),
    captureSettingsSnapshot: vi.fn(() => createSettingsSnapshot()),
    createResetSettingsAction: vi.fn(() =>
      createUndoableAction({ kind: 'reset-settings-action' }),
    ),
    executeUndoAction: vi.fn(() => Promise.resolve()),
    normalizeFolderNodeColor: vi.fn(color => color),
    defaultFolderNodeColor: '#336699',
    dagModeKey: 'dagMode',
    nodeSizeModeKey: 'nodeSizeMode',
  };
}

function createSource(
  overrides: Partial<GraphViewProviderMessageListenerSource> = {},
): GraphViewProviderMessageListenerSource {
  const source = {
    _timelineActive: false,
    _currentCommitSha: undefined,
    _userGroups: [],
    _disabledPlugins: new Set<string>(),
    _disabledSources: new Set<string>(),
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
    setFocusedFile: vi.fn(),
    _previewFileAtCommit: vi.fn(() => Promise.resolve()),
    _openFile: vi.fn(() => Promise.resolve()),
    _revealInExplorer: vi.fn(() => Promise.resolve()),
    _copyToClipboard: vi.fn(() => Promise.resolve()),
    _deleteFiles: vi.fn(() => Promise.resolve()),
    _renameFile: vi.fn(() => Promise.resolve()),
    _createFile: vi.fn(() => Promise.resolve()),
    _toggleFavorites: vi.fn(() => Promise.resolve()),
    _addToExclude: vi.fn(() => Promise.resolve()),
    _loadAndSendData: vi.fn(() => Promise.resolve()),
    _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    _getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve(undefined)),
    redo: vi.fn(() => Promise.resolve(undefined)),
    changeView: vi.fn(() => Promise.resolve()),
    setDepthLimit: vi.fn(() => Promise.resolve()),
    _indexRepository: vi.fn(() => Promise.resolve()),
    _jumpToCommit: vi.fn(() => Promise.resolve()),
    _resetTimeline: vi.fn(() => Promise.resolve()),
    _sendPhysicsSettings: vi.fn(),
    _updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    _resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendDepthState: vi.fn(),
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
    _sendGraphControls: vi.fn(),
    _sendPluginWebviewInjections: vi.fn(),
    invalidatePluginFiles: vi.fn(() => []),
    ...overrides,
  };

  source._sendGraphControls ??= vi.fn();

  return source as GraphViewProviderMessageListenerSource;
}

describe('graph view provider listener bridge', () => {
  it('does not analyze twice when the same webview listener is registered twice and refresh is clicked once', async () => {
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
    const deps = createDependencies();
    const source = createSource();

    setGraphViewProviderMessageListener(webview as never, source, deps);
    setGraphViewProviderMessageListener(webview as never, source, deps);

    expect(activeHandlers.size).toBe(1);

    await Promise.all([...activeHandlers].map(handler => handler({ type: 'REFRESH_GRAPH' })));

    expect(source._analyzeAndSendData).toHaveBeenCalledTimes(1);
  });

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
    await messageHandler?.({ type: 'UPDATE_LEGENDS', payload: { groups: userGroups } });

    expect(source._userGroups).toEqual(userGroups);
  });

  it('reprocesses plugin-owned files before reanalyzing when the settings context requests it', async () => {
    const { context, source } = await loadDefaultListenerHarness();

    await context.reprocessPluginFiles(['codegraphy.python']);

    expect(source.invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.python']);
    expect(source._analyzeAndSendData).toHaveBeenCalledOnce();
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

  it('wires read-context values into the captured listener context', async () => {
    const { context, source, workspaceFolders } = await loadDefaultListenerHarness();

    expect(context.workspaceFolder).toEqual(workspaceFolders[0]);
    expect(context.getTimelineActive()).toBe(false);
    expect(context.getCurrentCommitSha()).toBeUndefined();
    expect(context.getUserGroups()).toEqual([]);
    expect(context.getFilterPatterns()).toEqual(['dist/**']);
    expect(context.findNode('node-1')).toEqual(source._graphData.nodes[0]);
    expect(context.findEdge('edge-1')).toEqual(source._graphData.edges[0]);
  });

  it('wires plugin-context bridges into the captured listener context', async () => {
    const { context, source, configurationUpdate } = await loadDefaultListenerHarness();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(context.getPluginFilterPatterns()).toEqual(['plugin/**']);
    expect(context.hasWorkspace()).toBe(true);
    expect(context.isFirstAnalysis()).toBe(false);
    expect(context.isWebviewReadyNotified()).toBe(false);
    expect(context.getHiddenPluginGroupIds()).toBe(source._hiddenPluginGroupIds);

    context.loadGroupsAndFilterPatterns();
    context.loadDisabledRulesAndPlugins();
    context.sendFavorites();
    context.sendSettings();
    context.sendCachedTimeline();
    context.sendDecorations();
    context.sendContextMenuItems();
    context.sendPluginWebviewInjections();
    await context.waitForFirstWorkspaceReady();
    context.notifyWebviewReady();
    context.emitEvent('plugin:ready', { id: 'plugin.test' });
    context.logError('listener failed', new Error('boom'));
    await context.updateHiddenPluginGroups(['plugin.test:group']);
    context.setUserGroups([{ id: 'user:src', pattern: 'src/**', color: '#112233' }]);
    context.setFilterPatterns(['src/**']);
    context.setWebviewReadyNotified(true);

    expect(source._loadGroupsAndFilterPatterns).toHaveBeenCalledOnce();
    expect(source._loadDisabledRulesAndPlugins).toHaveBeenCalledOnce();
    expect(source._sendFavorites).toHaveBeenCalledOnce();
    expect(source._sendSettings).toHaveBeenCalledOnce();
    expect(source._sendCachedTimeline).toHaveBeenCalledOnce();
    expect(source._sendDecorations).toHaveBeenCalledOnce();
    expect(source._sendContextMenuItems).toHaveBeenCalledOnce();
    expect(source._sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(source._analyzer?.registry?.notifyWebviewReady).toHaveBeenCalledOnce();
    expect(source._eventBus.emit).toHaveBeenCalledWith('plugin:ready', { id: 'plugin.test' });
    expect(configurationUpdate).toHaveBeenCalledWith(
      'hiddenPluginGroups',
      ['plugin.test:group'],
    );
    expect(source._userGroups).toEqual([
      { id: 'user:src', pattern: 'src/**', color: '#112233' },
    ]);
    expect(source._filterPatterns).toEqual(['src/**']);
    expect(source._webviewReadyNotified).toBe(true);

    consoleError.mockRestore();
  });

  it('wires default settings-context dependency bridges into the captured listener context', async () => {
    const {
      context,
      source,
      captureSettingsSnapshot,
      ResetSettingsAction,
      execute,
      configurationGet,
      configurationUpdate,
    } = await loadDefaultListenerHarness();

    await context.updateDagMode('td' as DagMode);
    await context.updateNodeSizeMode('file-size' as NodeSizeMode);
    await context.updateConfig('showOrphans', false);
    await context.resetAllSettings();

    expect(configurationUpdate).toHaveBeenCalledWith(
      'dagMode',
      'td',
    );
    expect(configurationUpdate).toHaveBeenCalledWith(
      'nodeSizeMode',
      'file-size',
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'DAG_MODE_UPDATED',
      payload: { dagMode: 'td' },
    });
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'NODE_SIZE_MODE_UPDATED',
      payload: { nodeSizeMode: 'file-size' },
    });
    expect(configurationUpdate).toHaveBeenCalledWith(
      'showOrphans',
      false,
    );
    expect(captureSettingsSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ get: configurationGet }),
      source._getPhysicsSettings(),
      'file-size',
    );
    expect(ResetSettingsAction).toHaveBeenCalledWith(
      createSettingsSnapshot(),
      undefined,
      source._context,
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    );
    expect(execute).toHaveBeenCalledTimes(1);

    expect(context.getMaxFiles()).toBe(500);
    expect(context.getPlaybackSpeed()).toBe(1);
    expect(context.getDagMode()).toBe('td');
    expect(context.getNodeSizeMode()).toBe('file-size');
    expect(configurationGet).toHaveBeenCalledWith('maxFiles', 500);
    expect(configurationGet).toHaveBeenCalledWith('timeline.playbackSpeed', 1.0);
  });

  it('wires the default undo-execution dependency into the settings context', async () => {
    vi.resetModules();

    const execute = vi.fn(() => Promise.resolve());
    let executeUndoActionPromise: Promise<void> | undefined;

    vi.doMock('vscode', () => ({
      workspace: {
        workspaceFolders: undefined,
        getConfiguration: vi.fn(() => ({
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        })),
      },
      window: {
        showInformationMessage: vi.fn(),
        showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
      },
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/reader', () => ({
      getGraphViewConfigTarget: vi.fn(() => vscode.ConfigurationTarget.Workspace),
      normalizeFolderNodeColor: vi.fn((color: string) => color),
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/snapshot', () => ({
      captureGraphViewSettingsSnapshot: vi.fn(() => createSettingsSnapshot()),
    }));
    vi.doMock('../../../../../src/extension/actions/resetSettings', () => ({
      ResetSettingsAction: vi.fn(),
    }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute }),
    }));
    vi.doMock('../../../../../src/extension/graphView/webview/providerMessages/readContext', () => ({
      createGraphViewProviderMessageReadContext: vi.fn(() => ({})),
    }));
    vi.doMock(
      '../../../../../src/extension/graphView/webview/providerMessages/primaryActions',
      () => ({
        createGraphViewProviderMessagePrimaryActions: vi.fn(() => ({})),
      }),
    );
    vi.doMock(
      '../../../../../src/extension/graphView/webview/providerMessages/settingsContext',
      () => ({
        createGraphViewProviderMessageSettingsContext: vi.fn((_source, dependencies) => {
          executeUndoActionPromise = dependencies.executeUndoAction(
            createUndoableAction({ kind: 'reset-settings' }),
          );
          return {};
        }),
      }),
    );
    vi.doMock(
      '../../../../../src/extension/graphView/webview/providerMessages/pluginContext',
      () => ({
        createGraphViewProviderMessagePluginContext: vi.fn(() => ({})),
      }),
    );
    vi.doMock('../../../../../src/extension/graphView/webview/messages/listener', () => ({
      setGraphViewWebviewMessageListener: vi.fn(),
    }));

    const { setGraphViewProviderMessageListener: setListener } = await import(
      '../../../../../src/extension/graphView/webview/providerMessages/listener'
    );

    setListener({ onDidReceiveMessage: vi.fn() } as never, createSource());
    await executeUndoActionPromise;

    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'reset-settings' }),
    );
  });
});

async function loadDefaultListenerHarness() {
  vi.resetModules();

  let capturedContext: GraphViewMessageListenerContext | undefined;
  const workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'workspace', index: 0 }];
  const configurationGet = vi.fn(<T>(key: string, defaultValue: T) => {
    if (key === 'folderNodeColor') {
      return '#abcdef' as T;
    }

    return defaultValue;
  });
  const configurationUpdate = vi.fn(() => Promise.resolve());
  const getConfigTarget = vi.fn(() => vscode.ConfigurationTarget.Workspace);
  const captureSettingsSnapshot = vi.fn(() => createSettingsSnapshot());
  const execute = vi.fn(() => Promise.resolve());
  const ResetSettingsAction = vi.fn(function (
    this: Record<string, unknown>,
    snapshot: unknown,
    target: unknown,
    context: unknown,
    sendAllSettings: () => void,
    setNodeSizeMode: (mode: GraphViewProviderMessageListenerSource['_nodeSizeMode']) => void,
    analyzeAndSendData: () => Promise<void>,
  ) {
    this.description = 'reset settings';
    this.execute = vi.fn(async () => undefined);
    this.undo = vi.fn(async () => undefined);
    this.snapshot = snapshot;
    this.target = target;
    this.context = context;
    this.sendAllSettings = sendAllSettings;
    this.setNodeSizeMode = setNodeSizeMode;
    this.analyzeAndSendData = analyzeAndSendData;
  });
  const normalizeFolderNodeColor = vi.fn((color: string) => color.toUpperCase());

  vi.doMock('vscode', () => ({
    workspace: {
      workspaceFolders,
      getConfiguration: vi.fn(() => ({
        get: configurationGet,
        update: configurationUpdate,
      })),
    },
    window: {
      showInformationMessage: vi.fn(),
      showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    },
  }));
  vi.doMock('../../../../../src/extension/graphView/webview/messages/listener', () => ({
    setGraphViewWebviewMessageListener: vi.fn((_webview, context) => {
      capturedContext = context;
    }),
  }));
  vi.doMock('../../../../../src/extension/graphView/settings/reader', () => ({
    getGraphViewConfigTarget: getConfigTarget,
    normalizeFolderNodeColor,
  }));
  vi.doMock('../../../../../src/extension/graphView/settings/snapshot', () => ({
    captureGraphViewSettingsSnapshot: captureSettingsSnapshot,
  }));
  vi.doMock('../../../../../src/extension/actions/resetSettings', () => ({
    ResetSettingsAction,
  }));
  vi.doMock('../../../../../src/extension/undoManager', () => ({
    getUndoManager: () => ({ execute }),
  }));

  const { setGraphViewProviderMessageListener: setListener } = await import(
    '../../../../../src/extension/graphView/webview/providerMessages/listener'
  );
  const source = createSource({
    _graphData: {
      nodes: [{ id: 'node-1', label: 'node-1', color: '#93C5FD' }],
      edges: [{ id: 'edge-1', from: 'node-1', to: 'node-2' , kind: 'import', sources: [] }],
    } satisfies IGraphData,
  });
  const webview = {
    onDidReceiveMessage: vi.fn(),
  };

  setListener(webview as never, source);

  return {
    context: capturedContext as GraphViewMessageListenerContext,
    source,
    workspaceFolders,
    configurationGet,
    configurationUpdate,
    getConfigTarget,
    captureSettingsSnapshot,
    ResetSettingsAction,
    execute,
    normalizeFolderNodeColor,
  };
}
