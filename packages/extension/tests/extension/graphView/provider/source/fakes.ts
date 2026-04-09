import { vi } from 'vitest';
import * as vscode from 'vscode';
import type { GraphViewProviderMethodSourceOwner } from '../../../../../src/extension/graphView/provider/source/create';

export function createMethodSourceOwnerStub(): GraphViewProviderMethodSourceOwner {
  const analysisMethods = {
    _analyzeAndSendData: vi.fn(async () => undefined),
    _doAnalyzeAndSendData: vi.fn(async () => undefined),
    _markWorkspaceReady: vi.fn(),
    _isAnalysisStale: vi.fn(() => false),
    _isAbortError: vi.fn(() => false),
  };
  const commandMethods = {
    undo: vi.fn(async () => 'undo'),
    redo: vi.fn(async () => 'redo'),
    sendCommand: vi.fn(),
    emitEvent: vi.fn(),
  };
  const fileActionMethods = {
    _openFile: vi.fn(async () => undefined),
    _revealInExplorer: vi.fn(async () => undefined),
    _copyToClipboard: vi.fn(async () => undefined),
    _deleteFiles: vi.fn(async () => undefined),
    _renameFile: vi.fn(async () => undefined),
    _createFile: vi.fn(async () => undefined),
    _toggleFavorites: vi.fn(),
  };
  const fileVisitMethods = {
    _getFileInfo: vi.fn(() => ({ filePath: 'src/app.ts' })),
    _getVisitCount: vi.fn(() => 3),
    _incrementVisitCount: vi.fn(),
    _addToExclude: vi.fn(async () => undefined),
    _sendFavorites: vi.fn(),
  };
  const pluginMethods = {
    _sendGroupsUpdated: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendContextMenuItems: vi.fn(),
    _sendPluginWebviewInjections: vi.fn(),
    registerExternalPlugin: vi.fn(),
  };
  const pluginResourceMethods = {
    _computeMergedGroups: vi.fn(() => []),
    _registerBuiltInPluginRoots: vi.fn(),
    _resolveWebviewAssetPath: vi.fn(() => vscode.Uri.file('/test/asset.js')),
    _refreshWebviewResourceRoots: vi.fn(),
    _normalizeExternalExtensionUri: vi.fn((uri: vscode.Uri) => uri),
    _getLocalResourceRoots: vi.fn(() => []),
  };
  const physicsSettingsMethods = {
    _sendPhysicsSettings: vi.fn(),
    _getPhysicsSettings: vi.fn(() => ({ repelForce: -120 })),
    _updatePhysicsSetting: vi.fn(),
    _resetPhysicsSettings: vi.fn(),
  };
  const refreshMethods = {
    _rebuildAndSend: vi.fn(async () => undefined),
    _smartRebuild: vi.fn(async () => undefined),
  };
  const settingsStateMethods = {
    _loadDisabledRulesAndPlugins: vi.fn(() => false),
    _sendSettings: vi.fn(),
    _loadGroupsAndFilterPatterns: vi.fn(() => ({
      groups: [],
      filterPatterns: [],
    })),
    _sendAllSettings: vi.fn(),
  };
  const timelineMethods = {
    _indexRepository: vi.fn(async () => undefined),
    _jumpToCommit: vi.fn(async () => undefined),
    _resetTimeline: vi.fn(async () => undefined),
    _openSelectedNode: vi.fn(async () => undefined),
    _activateNode: vi.fn(async () => undefined),
    _previewFileAtCommit: vi.fn(async () => undefined),
    _sendCachedTimeline: vi.fn(),
  };
  const viewContextMethods = {
    _sendDepthState: vi.fn(),
    _updateViewContext: vi.fn(),
    _applyViewTransform: vi.fn(),
    updateGraphData: vi.fn(),
    getGraphData: vi.fn(() => ({ nodes: [], edges: [] })),
  };
  const viewSelectionMethods = {
    setDepthMode: vi.fn(async () => undefined),
    setFocusedFile: vi.fn(),
    setDepthLimit: vi.fn(async () => undefined),
  };
  const webviewMethods = {
    _sendMessage: vi.fn(),
    resolveWebviewView: vi.fn(),
    openInEditor: vi.fn(),
    sendToWebview: vi.fn(),
    onWebviewMessage: vi.fn(),
  };

  return {
    _view: undefined,
    _panels: [],
    _graphData: { nodes: [], edges: [] },
    _analyzer: undefined,
    _analyzerInitialized: false,
    _analyzerInitPromise: undefined,
    _analysisController: undefined,
    _analysisRequestId: 1,
    _viewRegistry: { id: 'registry' },
    _dagMode: null,
    _nodeSizeMode: 'connections',
    _rawGraphData: { nodes: [], edges: [] },
    _viewContext: {
      activePlugins: new Set<string>(),
      depthLimit: 1,
    },
    _groups: [],
    _userGroups: [],
    _hiddenPluginGroupIds: new Set<string>(),
    _filterPatterns: [],
    _disabledSources: new Set<string>(),
    _disabledPlugins: new Set<string>(),
    _gitAnalyzer: undefined,
    _currentCommitSha: undefined,
    _timelineActive: false,
    _eventBus: { id: 'eventBus' },
    _decorationManager: { id: 'decorationManager' },
    _firstAnalysis: true,
    _resolveFirstWorkspaceReady: vi.fn(),
    _firstWorkspaceReadyPromise: Promise.resolve(),
    _webviewReadyNotified: false,
    _indexingController: undefined,
    _pluginExtensionUris: new Map<string, vscode.Uri>(),
    _extensionUri: vscode.Uri.file('/test/extension'),
    _context: {
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(async () => undefined),
      },
    } as unknown as vscode.ExtensionContext,
    _methodContainers: {
      analysis: analysisMethods,
      command: commandMethods,
      fileAction: fileActionMethods,
      fileVisit: fileVisitMethods,
      physicsSettings: physicsSettingsMethods,
      plugin: pluginMethods,
      pluginResource: pluginResourceMethods,
      refresh: refreshMethods,
      settingsState: settingsStateMethods,
      timeline: timelineMethods,
      viewContext: viewContextMethods,
      viewSelection: viewSelectionMethods,
      webview: webviewMethods,
    },
    _analysisMethods: analysisMethods,
    _commandMethods: commandMethods,
    _fileActionMethods: fileActionMethods,
    _fileVisitMethods: fileVisitMethods,
    _pluginMethods: pluginMethods,
    _pluginResourceMethods: pluginResourceMethods,
    _physicsSettingsMethods: physicsSettingsMethods,
    _refreshMethods: refreshMethods,
    _settingsStateMethods: settingsStateMethods,
    _timelineMethods: timelineMethods,
    _viewContextMethods: viewContextMethods,
    _viewSelectionMethods: viewSelectionMethods,
    _webviewMethods: webviewMethods,
  } as unknown as GraphViewProviderMethodSourceOwner;
}
