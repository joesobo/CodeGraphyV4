/**
 * @fileoverview Tests for ResetSettingsAction.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { ResetSettingsAction } from '../../../src/extension/actions/ResetSettingsAction';
import { getUndoManager, resetUndoManager } from '../../../src/extension/UndoManager';
import type { ISettingsSnapshot } from '../../../src/shared/types';

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

describe('ResetSettingsAction', () => {
  let physicsStore: Record<string, unknown>;
  let codegraphyStore: Record<string, unknown>;
  let mockPhysicsConfig: vscode.WorkspaceConfiguration;
  let mockCodegraphyConfig: vscode.WorkspaceConfiguration;
  let mockSendAllSettings: ReturnType<typeof vi.fn>;
  let mockRefreshGraph: ReturnType<typeof vi.fn>;

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
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });
  }

  function createAction() {
    return new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetUndoManager();

    physicsStore = {
      repelForce: 5, linkDistance: 200, linkForce: 0.5, damping: 0.3, centerForce: 0.5,
    };
    codegraphyStore = {
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

    mockPhysicsConfig = createMockConfig(physicsStore);
    mockCodegraphyConfig = createMockConfig(codegraphyStore);
    wireConfigMocks();

    mockSendAllSettings = vi.fn();
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
    for (const call of (mockPhysicsConfig.update as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[1]).toBeUndefined();
    }
    // Every codegraphy key should be reset
    for (const call of (mockCodegraphyConfig.update as ReturnType<typeof vi.fn>).mock.calls) {
      expect(call[1]).toBeUndefined();
    }

    // Stores should be empty (all keys deleted)
    expect(Object.keys(physicsStore)).toHaveLength(0);
    expect(Object.keys(codegraphyStore)).toHaveLength(0);
  });

  it('execute sends default nodeSizeMode and refreshes graph', async () => {
    await createAction().execute();

    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('undo restores all captured config values', async () => {
    const action = createAction();
    await action.execute();

    // Stores are now empty after execute
    expect(Object.keys(physicsStore)).toHaveLength(0);
    expect(Object.keys(codegraphyStore)).toHaveLength(0);

    vi.clearAllMocks();
    wireConfigMocks();
    await action.undo();

    // Stores should be repopulated with original values
    expect(physicsStore).toEqual(NON_DEFAULT_SNAPSHOT.physics);
    expect(codegraphyStore['showOrphans']).toBe(false);
    expect(codegraphyStore['directionMode']).toBe('particles');
    expect(codegraphyStore['maxFiles']).toBe(1000);
    expect(codegraphyStore['hiddenPluginGroups']).toEqual(['group-1', 'group-2']);
    // bidirectionalEdges config key maps to bidirectionalMode snapshot field
    expect(codegraphyStore['bidirectionalEdges']).toBe('combined');
  });

  it('undo sends original nodeSizeMode and refreshes graph', async () => {
    const action = createAction();
    await action.execute();
    vi.clearAllMocks();
    wireConfigMocks();

    await action.undo();

    expect(mockSendAllSettings).toHaveBeenCalledWith('file-size');
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('works with UndoManager execute → undo → redo', async () => {
    const undoManager = getUndoManager();
    const action = createAction();

    await undoManager.execute(action);
    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');

    vi.clearAllMocks();
    wireConfigMocks();

    const undoDesc = await undoManager.undo();
    expect(undoDesc).toBe('Reset all settings');
    expect(mockSendAllSettings).toHaveBeenCalledWith('file-size');

    vi.clearAllMocks();
    wireConfigMocks();

    const redoDesc = await undoManager.redo();
    expect(redoDesc).toBe('Reset all settings');
    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');
  });
});
