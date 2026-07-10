import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '@/shared/graph/contracts';
import type { IGroup } from '@/shared/settings/groups';
import type { DagMode, NodeSizeMode } from '@/shared/settings/modes';
import type { ISettingsSnapshot } from '../../../../../src/shared/settings/snapshot';
import type { IViewContext } from '@/core/views/contracts';
import type { IUndoableAction } from '../../../../../src/extension/undoManager';
import type { GraphViewMessageListenerContext } from '../../../../../src/extension/graphView/webview/messages/listener';
import { DEFAULT_MAX_FILES } from '../../../../../src/shared/settings/defaults';
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
    legends: [],
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
    showOrphans: true,
    bidirectionalMode: 'separate',
    directionMode: 'arrows',
    directionColor: '#123456',
    nodeColors: { file: '#999999', folder: '#888888' },
    nodeVisibility: { file: true, folder: true },
    edgeVisibility: { imports: true, nests: false },
    legendVisibility: {},
    legendOrder: [],
    particleSpeed: 0.005,
    particleSize: 4,
    pluginData: {},
    showLabels: true,
    maxFiles: DEFAULT_MAX_FILES,
    verboseDiagnostics: false,
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
    dagModeKey: 'dagMode',
    nodeSizeModeKey: 'nodeSizeMode',
  };
}

function createSource(
  overrides: Partial<GraphViewProviderMessageListenerSource> = {},
): GraphViewProviderMessageListenerSource {
  const source = {
    _currentCommitSha: undefined,
    _userGroups: [],
    _disabledPlugins: new Set<string>(),
    _filterPatterns: ['dist/**'],
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _viewContext: { activePlugins: new Set() } satisfies IViewContext,
    _depthMode: false,
    _dagMode: null,
    _nodeSizeMode: 'connections',
    _firstAnalysis: false,
    _webviewReadyNotified: false,
    _webviewMethods: {
      openInEditor: vi.fn(),
    },
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
    refreshIndex: vi.fn(() => Promise.resolve()),
    refreshChangedFiles: vi.fn(() => Promise.resolve()),
    clearCacheAndRefresh: vi.fn(() => Promise.resolve()),
    _getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve(undefined)),
    redo: vi.fn(() => Promise.resolve(undefined)),
    setDepthMode: vi.fn(() => Promise.resolve()),
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
    _sendPluginStatuses: vi.fn(),
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

    expect(source.refreshIndex).toHaveBeenCalledTimes(1);
    expect(source.clearCacheAndRefresh).not.toHaveBeenCalled();
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
    await messageHandler?.({ type: 'UPDATE_LEGENDS', payload: { legends: userGroups } });

    expect(source._userGroups).toEqual(userGroups);
  });

  it('routes OPEN_IN_EDITOR through the provider webview methods', async () => {
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
    await messageHandler?.({ type: 'OPEN_IN_EDITOR' });

    expect(source._webviewMethods.openInEditor).toHaveBeenCalledOnce();
  });

  it('reprocesses plugin-owned files with a scoped refresh when invalidated files are known', async () => {
    const { context, source } = await loadDefaultListenerHarness({
      invalidatePluginFiles: vi.fn(() => ['src/plugin.py']),
    });

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(source.invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(source.refreshChangedFiles).toHaveBeenCalledWith(['src/plugin.py']);
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('skips a full reanalysis when plugin-owned invalidation reports no concrete files', async () => {
    const { context, source } = await loadDefaultListenerHarness({
      invalidatePluginFiles: vi.fn(() => []),
    });

    await context.reprocessPluginFiles(['codegraphy.vue']);

    expect(source.invalidatePluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(source.refreshChangedFiles).not.toHaveBeenCalled();
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
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
      '../../../../../src/extension/graphView/webview/providerMessages/settingsContext/create',
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
  }, 15_000);

  it('does not enumerate proposed workspace getters while building default dependencies', async () => {
    vi.resetModules();

    const proposedGetter = vi.fn(() => {
      throw new Error('proposed getter should not be touched');
    });
    const workspace = {
      workspaceFolders: undefined,
      getConfiguration: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(() => Promise.resolve()),
      })),
    };

    Object.defineProperty(workspace, 'isAgentSessionsWorkspace', {
      enumerable: true,
      get: proposedGetter,
    });

    vi.doMock('vscode', () => ({
      workspace,
      window: {
        showInformationMessage: vi.fn(),
        showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
      },
      ConfigurationTarget: {
        Workspace: 2,
      },
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/reader', () => ({
      getGraphViewConfigTarget: vi.fn(() => vscode.ConfigurationTarget.Workspace),
    }));
    vi.doMock('../../../../../src/extension/graphView/settings/snapshot', () => ({
      captureGraphViewSettingsSnapshot: vi.fn(() => createSettingsSnapshot()),
    }));
    vi.doMock('../../../../../src/extension/actions/resetSettings', () => ({
      ResetSettingsAction: vi.fn(),
    }));
    vi.doMock('../../../../../src/extension/undoManager', () => ({
      getUndoManager: () => ({ execute: vi.fn(() => Promise.resolve()) }),
    }));
    vi.doMock('../../../../../src/extension/repoSettings/current', () => ({
      getCodeGraphyConfiguration: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(() => Promise.resolve()),
      })),
    }));
    vi.doMock('../../../../../src/extension/graphView/webview/messages/listener', () => ({
      setGraphViewWebviewMessageListener: vi.fn(),
    }));

    await expect(import(
      '../../../../../src/extension/graphView/webview/providerMessages/listener'
    )).resolves.toBeDefined();
    expect(proposedGetter).not.toHaveBeenCalled();
  });
});

async function loadDefaultListenerHarness(
  sourceOverrides: Partial<GraphViewProviderMessageListenerSource> = {},
) {
  vi.resetModules();

  let capturedContext: GraphViewMessageListenerContext | undefined;
  const workspaceFolders = [{ uri: { fsPath: '/workspace' }, name: 'workspace', index: 0 }];
  const configurationGet = vi.fn(<T>(key: string, defaultValue: T) => {
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
    ...sourceOverrides,
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
  };
}
