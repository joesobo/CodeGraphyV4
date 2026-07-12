import { vi } from 'vitest';
import {
  createGraphViewProviderMessagePrimaryActions,
} from '../../../../../src/extension/graphView/webview/providerMessages/primaryActions';

export function createSource(overrides: Record<string, unknown> = {}) {
  return {
    _openSelectedNode: vi.fn(() => Promise.resolve()),
    _activateNode: vi.fn(() => Promise.resolve()),
    setFocusedFile: vi.fn(),
    _openFile: vi.fn(() => Promise.resolve()),
    _webviewMethods: {
      openInEditor: vi.fn(() => Promise.resolve()),
    },
    _revealInExplorer: vi.fn(() => Promise.resolve()),
    _copyToClipboard: vi.fn(() => Promise.resolve()),
    _deleteFiles: vi.fn(() => Promise.resolve()),
    _renameFile: vi.fn(() => Promise.resolve()),
    _createFile: vi.fn(() => Promise.resolve()),
    _createFolder: vi.fn(() => Promise.resolve()),
    _toggleFavorites: vi.fn(() => Promise.resolve()),
    _addToExclude: vi.fn(() => Promise.resolve()),
    _loadAndSendData: vi.fn(() => Promise.resolve()),
    _indexAndSendData: vi.fn(() => Promise.resolve()),
    _analyzeAndSendData: vi.fn(() => Promise.resolve()),
    refreshIndex: vi.fn(() => Promise.resolve()),
    clearCacheAndRefresh: vi.fn(() => Promise.resolve()),
    _getFileInfo: vi.fn(() => Promise.resolve()),
    undo: vi.fn(() => Promise.resolve('undo')),
    redo: vi.fn(() => Promise.resolve('redo')),
    setDepthMode: vi.fn(() => Promise.resolve()),
    setDepthLimit: vi.fn(() => Promise.resolve()),
    _sendPhysicsSettings: vi.fn(),
    _updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    _resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendMessage: vi.fn(),
    _applyViewTransform: vi.fn(),
    _smartRebuild: vi.fn(),
    _graphData: { nodes: [], edges: [] },
    ...overrides,
  };
}

export function createDependencies() {
  return {
    workspace: {
      workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
      getConfiguration: vi.fn(() => ({
        get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
      })),
    },
    window: {
      showInformationMessage: vi.fn(),
      showOpenDialog: vi.fn(() => Promise.resolve(undefined)),
    },
    getConfigTarget: vi.fn(),
  };
}

export function createActions(
  source = createSource(),
  dependencies = createDependencies(),
) {
  return createGraphViewProviderMessagePrimaryActions(source as never, dependencies as never);
}
