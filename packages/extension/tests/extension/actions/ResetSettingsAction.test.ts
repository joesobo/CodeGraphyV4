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

    // Create stable config objects (same instance returned on every call per section)
    mockPhysicsConfig = createMockConfig(physicsStore);
    mockCodegraphyConfig = createMockConfig(codegraphyStore);

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    mockSendAllSettings = vi.fn();
    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('has descriptive description', () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );
    expect(action.description).toBe('Reset all settings');
  });

  it('execute resets physics config keys to undefined', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();

    const physicsConfig = vscode.workspace.getConfiguration('codegraphy.physics');
    expect(physicsConfig.update).toHaveBeenCalledWith('repelForce', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('linkDistance', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('linkForce', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('damping', undefined, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('centerForce', undefined, vscode.ConfigurationTarget.Workspace);
  });

  it('execute resets codegraphy config keys to undefined/defaults', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();

    const config = vscode.workspace.getConfiguration('codegraphy');
    expect(config.update).toHaveBeenCalledWith('groups', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('filterPatterns', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('showOrphans', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('bidirectionalEdges', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('directionMode', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('directionColor', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('folderNodeColor', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('particleSpeed', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('particleSize', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('showLabels', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('maxFiles', undefined, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('hiddenPluginGroups', undefined, vscode.ConfigurationTarget.Workspace);
  });

  it('execute calls sendAllSettings with default nodeSizeMode', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();

    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('undo restores all captured config values', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();
    vi.clearAllMocks();
    // Re-wire mock to keep returning the same stable config objects after clearAllMocks
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    await action.undo();

    const physicsConfig = vscode.workspace.getConfiguration('codegraphy.physics');
    expect(physicsConfig.update).toHaveBeenCalledWith('repelForce', 5, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('linkDistance', 200, vscode.ConfigurationTarget.Workspace);
    expect(physicsConfig.update).toHaveBeenCalledWith('damping', 0.3, vscode.ConfigurationTarget.Workspace);

    const config = vscode.workspace.getConfiguration('codegraphy');
    expect(config.update).toHaveBeenCalledWith('groups', NON_DEFAULT_SNAPSHOT.groups, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('showOrphans', false, vscode.ConfigurationTarget.Workspace);
    expect(config.update).toHaveBeenCalledWith('directionMode', 'particles', vscode.ConfigurationTarget.Workspace);
  });

  it('undo calls sendAllSettings with original nodeSizeMode', async () => {
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await action.execute();
    vi.clearAllMocks();
    // Re-wire mock to keep returning the same stable config objects after clearAllMocks
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    await action.undo();

    expect(mockSendAllSettings).toHaveBeenCalledWith('file-size');
    expect(mockRefreshGraph).toHaveBeenCalled();
  });

  it('works with UndoManager execute → undo → redo', async () => {
    const undoManager = getUndoManager();
    const action = new ResetSettingsAction(
      NON_DEFAULT_SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      mockSendAllSettings,
      mockRefreshGraph,
    );

    await undoManager.execute(action);
    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');

    vi.clearAllMocks();
    // Re-wire mock to keep returning the same stable config objects after clearAllMocks
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    const undoDesc = await undoManager.undo();
    expect(undoDesc).toBe('Reset all settings');
    expect(mockSendAllSettings).toHaveBeenCalledWith('file-size');

    vi.clearAllMocks();
    // Re-wire mock to keep returning the same stable config objects after clearAllMocks
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    const redoDesc = await undoManager.redo();
    expect(redoDesc).toBe('Reset all settings');
    expect(mockSendAllSettings).toHaveBeenCalledWith('connections');
  });
});
