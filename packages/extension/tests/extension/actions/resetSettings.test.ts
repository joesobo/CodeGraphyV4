/**
 * @fileoverview Tests for ResetSettingsAction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { ResetSettingsAction } from '../../../src/extension/actions/resetSettings';
import { getUndoManager, resetUndoManager } from '../../../src/extension/undoManager';
import type { ISettingsSnapshot } from '../../../src/shared/settings/snapshot';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

/** Build a mock WorkspaceConfiguration that stores values in a plain object. */
function createMockConfig(store: Record<string, unknown>) {
  const get = vi.fn(<T>(key: string, defaultValue?: T): T => {
    return (key in store ? store[key] : defaultValue) as T;
  });
  const update = vi.fn(async (key: string, value: unknown) => {
    if (value === undefined) {
      delete store[key];
    } else {
      store[key] = value;
    }
  });
  const inspect = vi.fn(() => ({ workspaceValue: undefined }));
  return { get, update, inspect } as unknown as vscode.WorkspaceConfiguration;
}

/** Build a mock ExtensionContext with workspaceState. */
function createMockContext() {
  const state: Record<string, unknown> = {};
  return {
    workspaceState: {
      get: vi.fn(<T>(key: string, defaultValue?: T): T => {
        return (key in state ? state[key] : defaultValue) as T;
      }),
      update: vi.fn(async (key: string, value: unknown) => {
        state[key] = value;
      }),
    },
    _state: state,
  } as unknown as vscode.ExtensionContext & { _state: Record<string, unknown> };
}

describe('ResetSettingsAction', () => {
  let settingsStore: Record<string, unknown>;
  let mockConfig: vscode.WorkspaceConfiguration;
  let mockSendAllSettings: ReturnType<typeof vi.fn>;
  let mockSetNodeSizeMode: ReturnType<typeof vi.fn>;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;
  let mockContext: vscode.ExtensionContext & { _state: Record<string, unknown> };

  const NON_DEFAULT_SNAPSHOT: ISettingsSnapshot = {
    physics: { repelForce: 5, linkDistance: 200, linkForce: 0.5, damping: 0.3, centerForce: 0.5 },
    groups: [{ id: 'g1', pattern: '*.ts', color: '#FF0000' }],
    filterPatterns: ['**/*.test.ts'],
    showOrphans: false,
    bidirectionalMode: 'combined',
    directionMode: 'particles',
    directionColor: '#FF0000',
    folderNodeColor: '#00FF00',
    particleSpeed: 0.002,
    particleSize: 8,
    showLabels: false,
    maxFiles: 1000,
    hiddenPluginGroups: ['group-1', 'group-2'],
    nodeSizeMode: 'file-size',
  };

  function wireConfigMocks() {
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);
  }

  function createAction() {
    return new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockContext,
      mockSendAllSettings,
      mockSetNodeSizeMode,
      mockRefreshGraph,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetUndoManager();

    settingsStore = {
      'physics.repelForce': 5,
      'physics.linkDistance': 200,
      'physics.linkForce': 0.5,
      'physics.damping': 0.3,
      'physics.centerForce': 0.5,
      groups: [{ id: 'g1', pattern: '*.ts', color: '#FF0000' }],
      filterPatterns: ['**/*.test.ts'],
      showOrphans: false,
      bidirectionalEdges: 'combined',
      directionMode: 'particles',
      directionColor: '#FF0000',
      folderNodeColor: '#00FF00',
      particleSpeed: 0.002,
      particleSize: 8,
      showLabels: false,
      maxFiles: 1000,
      hiddenPluginGroups: ['group-1', 'group-2'],
    };

    mockConfig = createMockConfig(settingsStore);
    wireConfigMocks();

    mockContext = createMockContext();
    mockSendAllSettings = vi.fn();
    mockSetNodeSizeMode = vi.fn();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has descriptive description', () => {
    expect(createAction().description).toBe('Reset all settings');
  });

  it('execute resets all config keys to undefined', async () => {
    await createAction().execute();

    // Every physics key should be reset
    const updateCalls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls;

    for (const call of updateCalls.filter(([key]) => String(key).startsWith('physics.'))) {
      expect(call[1]).toBeUndefined();
    }
    for (const call of updateCalls.filter(([key]) => !String(key).startsWith('physics.'))) {
      expect(call[1]).toBeUndefined();
    }

    expect(Object.keys(settingsStore)).toHaveLength(0);
  });

  it('execute resets nodeSizeMode to connections and refreshes graph', async () => {
    await createAction().execute();

    expect(mockSetNodeSizeMode).toHaveBeenCalledWith('connections');
    expect(mockContext._state['codegraphy.nodeSizeMode']).toBe('connections');
    expect(mockSendAllSettings).toHaveBeenCalled();
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('undo restores all captured config values', async () => {
    const action = createAction();
    await action.execute();

    // Stores are now empty after execute
    expect(Object.keys(settingsStore)).toHaveLength(0);

    vi.clearAllMocks();
    wireConfigMocks();
    await action.undo();

    expect(settingsStore['physics.repelForce']).toBe(5);
    expect(settingsStore['physics.linkDistance']).toBe(200);
    expect(settingsStore['physics.linkForce']).toBe(0.5);
    expect(settingsStore['physics.damping']).toBe(0.3);
    expect(settingsStore['physics.centerForce']).toBe(0.5);
    expect(settingsStore.showOrphans).toBe(false);
    expect(settingsStore.directionMode).toBe('particles');
    expect(settingsStore.maxFiles).toBe(1000);
    expect(settingsStore.hiddenPluginGroups).toEqual(['group-1', 'group-2']);
    expect(settingsStore.bidirectionalEdges).toBe('combined');
  });

  it('undo restores original nodeSizeMode and refreshes graph', async () => {
    const action = createAction();
    await action.execute();
    vi.clearAllMocks();
    wireConfigMocks();

    await action.undo();

    expect(mockSetNodeSizeMode).toHaveBeenCalledWith('file-size');
    expect(mockContext._state['codegraphy.nodeSizeMode']).toBe('file-size');
    expect(mockSendAllSettings).toHaveBeenCalled();
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('works with UndoManager execute → undo → redo', async () => {
    const undoManager = getUndoManager();
    const action = createAction();

    await undoManager.execute(action);
    expect(mockSetNodeSizeMode).toHaveBeenCalledWith('connections');

    vi.clearAllMocks();
    wireConfigMocks();

    const undoDesc = await undoManager.undo();
    expect(undoDesc).toBe('Reset all settings');
    expect(mockSetNodeSizeMode).toHaveBeenCalledWith('file-size');

    vi.clearAllMocks();
    wireConfigMocks();

    const redoDesc = await undoManager.redo();
    expect(redoDesc).toBe('Reset all settings');
    expect(mockSetNodeSizeMode).toHaveBeenCalledWith('connections');
  });
});
