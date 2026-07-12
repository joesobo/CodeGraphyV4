import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  createGraphViewPrimarySettingsMessageState,
} from '../../../../../../src/extension/graphView/webview/dispatch/primaryState';
import type { GraphViewPrimaryMessageContext } from '../../../../../../src/extension/graphView/webview/dispatch/primary';

function createContext(
  overrides: Partial<GraphViewPrimaryMessageContext> = {},
): GraphViewPrimaryMessageContext {
  const context = {
    getUserGroups: vi.fn(() => []),
    getFilterPatterns: vi.fn(() => []),
    getViewContext: vi.fn(() => ({ activePlugins: new Set() })),
    sendGraphControls: vi.fn(),
    openSelectedNode: vi.fn(() => Promise.resolve()),
    activateNode: vi.fn(() => Promise.resolve()),
    setFocusedFile: vi.fn(),
    openFile: vi.fn(() => Promise.resolve()),
    revealInExplorer: vi.fn(() => Promise.resolve()),
    copyToClipboard: vi.fn(() => Promise.resolve()),
    deleteFiles: vi.fn(() => Promise.resolve()),
    renameFile: vi.fn(() => Promise.resolve()),
    createFile: vi.fn(() => Promise.resolve()),
    createFolder: vi.fn(() => Promise.resolve()),
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
    sendPhysicsSettings: vi.fn(),
    updatePhysicsSetting: vi.fn(() => Promise.resolve()),
    resetPhysicsSettings: vi.fn(() => Promise.resolve()),
    workspaceFolder: undefined,
    persistLegends: vi.fn(() => Promise.resolve()),
    persistDefaultLegendVisibility: vi.fn(() => Promise.resolve()),
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
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  context.sendGraphControls ??= vi.fn();

  return context as GraphViewPrimaryMessageContext;
}

describe('createGraphViewPrimarySettingsMessageState', () => {
  it('reads the current settings state from the primary message context', () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const asWebviewUri = vi.fn(uri => ({ toString: () => `webview:${uri.fsPath}` }));
    const context = createContext({
      getFilterPatterns: vi.fn(() => ['dist/**']),
      workspaceFolder,
      asWebviewUri,
    });

    const state = createGraphViewPrimarySettingsMessageState(context);

    expect(state).toMatchObject({
      filterPatterns: ['dist/**'],
      workspaceRoot: '/workspace',
    });
    expect(state.asWebviewUri?.(vscode.Uri.file('/workspace/theme.css')).toString()).toBe('webview:/workspace/theme.css');
    expect(asWebviewUri).toHaveBeenCalledWith(vscode.Uri.file('/workspace/theme.css'));
  });
});
