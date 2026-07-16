import { vi } from 'vitest';
import * as vscode from 'vscode';
import type { IGraphData } from '@/shared/graph/contracts';
import type { ISettingsSnapshot } from '../../../../../src/shared/settings/snapshot';
import type { IViewContext } from '@/core/views/contracts';
import type { IUndoableAction } from '../../../../../src/extension/undoManager';
import { DEFAULT_MAX_FILES } from '../../../../../src/shared/settings/defaults';
import type {
  GraphViewProviderMessageListenerDependencies,
  GraphViewProviderMessageListenerSource,
} from '../../../../../src/extension/graphView/webview/providerMessages/listener';

type MockUndoableAction = IUndoableAction & { kind?: string };

export function createUndoableAction(overrides: Partial<MockUndoableAction> = {}): MockUndoableAction {
  return {
    description: 'test action',
    execute: vi.fn(async () => undefined),
    undo: vi.fn(async () => undefined),
    ...overrides,
  };
}

export function createSettingsSnapshot(): ISettingsSnapshot {
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
    showFps: false,
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

export function resetListenerMocks(): void {
  vi.restoreAllMocks();
  vi.doUnmock('vscode');
  vi.doUnmock('../../../../../src/extension/graphView/webview/messages/listener');
  vi.doUnmock('../../../../../src/extension/graphView/settings/reader');
  vi.doUnmock('../../../../../src/extension/graphView/settings/snapshot');
  vi.doUnmock('../../../../../src/extension/actions/resetSettings');
  vi.doUnmock('../../../../../src/extension/undoManager');
  vi.resetModules();
}

export function createDependencies(): GraphViewProviderMessageListenerDependencies {
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
    nodeSizeModeKey: 'nodeSizeMode',
  };
}

export function createSource(
  overrides: Partial<GraphViewProviderMessageListenerSource> = {},
): GraphViewProviderMessageListenerSource {
  const source = {
    _userGroups: [],
    _disabledPlugins: new Set<string>(),
    _filterPatterns: ['dist/**'],
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _viewContext: { activePlugins: new Set() } satisfies IViewContext,
    _depthMode: false,
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
