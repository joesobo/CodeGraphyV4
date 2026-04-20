/**
 * @fileoverview Additional tests for ResetSettingsAction targeting surviving mutants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ResetSettingsAction } from '../../../../src/extension/actions/resetSettings';
import type { ISettingsSnapshot } from '../../../../src/shared/settings/snapshot';

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

function createMockConfig(store: Record<string, unknown>) {
  return {
    get: vi.fn(<T>(key: string, defaultValue?: T): T => {
      return (key in store ? store[key] : defaultValue) as T;
    }),
    update: vi.fn(async (key: string, value: unknown) => {
      if (value === undefined) {
        delete store[key];
      } else {
        store[key] = value;
      }
    }),
  } as unknown as vscode.WorkspaceConfiguration;
}

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

describe('ResetSettingsAction (extra mutant coverage)', () => {
  let settingsStore: Record<string, unknown>;

  const SNAPSHOT: ISettingsSnapshot = {
    physics: { repelForce: 10, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 },
    legends: [],
    filterPatterns: [],
    showOrphans: true,
    bidirectionalMode: 'separate',
    directionMode: 'arrows',
    directionColor: '#000000',
    nodeColors: { file: '#999999', folder: '#888888' },
    nodeVisibility: { file: true, folder: true },
    edgeVisibility: { imports: true, nests: false },
    pluginOrder: ['codegraphy.markdown', 'codegraphy.python'],
    disabledPlugins: ['codegraphy.python'],
    particleSpeed: 0.001,
    particleSize: 4,
    showLabels: true,
    maxFiles: 500,
    nodeSizeMode: 'connections',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore = {
      'physics.repelForce': SNAPSHOT.physics.repelForce,
      'physics.linkDistance': SNAPSHOT.physics.linkDistance,
      'physics.linkForce': SNAPSHOT.physics.linkForce,
      'physics.damping': SNAPSHOT.physics.damping,
      'physics.centerForce': SNAPSHOT.physics.centerForce,
      legend: [],
      filterPatterns: [],
      showOrphans: true,
      bidirectionalEdges: 'separate',
      directionMode: 'arrows',
      directionColor: '#000000',
      nodeColors: { file: '#999999', folder: '#888888' },
      nodeVisibility: { file: true, folder: true },
      edgeVisibility: { imports: true, nests: false },
      pluginOrder: ['codegraphy.markdown', 'codegraphy.python'],
      disabledPlugins: ['codegraphy.python'],
      particleSpeed: 0.001,
      particleSize: 4,
      showLabels: true,
      maxFiles: 500,
      nodeSizeMode: 'file-size',
    };
  });

  it('resets all five physics keys to undefined during execute', async () => {
    const mockConfig = createMockConfig(settingsStore);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);

    const ctx = createMockContext();
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      ctx,
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    const physicsUpdateCalls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => String(key).startsWith('physics.'));
    const updatedKeys = physicsUpdateCalls.map((call) => call[0]);
    expect(updatedKeys).toContain('physics.repelForce');
    expect(updatedKeys).toContain('physics.linkDistance');
    expect(updatedKeys).toContain('physics.linkForce');
    expect(updatedKeys).toContain('physics.damping');
    expect(updatedKeys).toContain('physics.centerForce');

    // All values should be undefined
    for (const call of physicsUpdateCalls) {
      expect(call[1]).toBeUndefined();
    }
  });

  it('resets all CONFIG_TO_SNAPSHOT config keys to undefined during execute', async () => {
    const mockConfig = createMockConfig(settingsStore);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);

    const ctx = createMockContext();
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      ctx,
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    const cgUpdateCalls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => !String(key).startsWith('physics.'));
    const updatedKeys = cgUpdateCalls.map((call) => call[0]);
    expect(updatedKeys).toContain('legend');
    expect(updatedKeys).toContain('filterPatterns');
    expect(updatedKeys).toContain('showOrphans');
    expect(updatedKeys).toContain('bidirectionalEdges');
    expect(updatedKeys).toContain('directionMode');
    expect(updatedKeys).toContain('directionColor');
    expect(updatedKeys).toContain('nodeColors');
    expect(updatedKeys).toContain('nodeVisibility');
    expect(updatedKeys).toContain('edgeVisibility');
    expect(updatedKeys).toContain('pluginOrder');
    expect(updatedKeys).toContain('disabledPlugins');
    expect(updatedKeys).toContain('particleSpeed');
    expect(updatedKeys).toContain('particleSize');
    expect(updatedKeys).toContain('showLabels');
    expect(updatedKeys).toContain('maxFiles');
    expect(updatedKeys).toContain('nodeSizeMode');

    for (const call of cgUpdateCalls) {
      if (call[0] === 'nodeSizeMode') {
        expect(call[1]).toBe('connections');
        continue;
      }

      expect(call[1]).toBeUndefined();
    }
  });

  it('undo restores each physics key to its original value', async () => {
    const originalPhysics = { repelForce: 10, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 };
    const mockConfig = createMockConfig({ ...settingsStore });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);

    const ctx = createMockContext();
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      ctx,
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();
    vi.clearAllMocks();
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);

    await action.undo();

    const physicsUpdateCalls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => String(key).startsWith('physics.'));
    for (const call of physicsUpdateCalls) {
      const key = String(call[0]).replace('physics.', '') as keyof typeof originalPhysics;
      expect(call[1]).toBe(originalPhysics[key]);
    }

    const nonPhysicsUpdateCalls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => !String(key).startsWith('physics.'));
    expect(nonPhysicsUpdateCalls.some(([key, value]) => key === 'nodeColors' && value === SNAPSHOT.nodeColors)).toBe(true);
    expect(nonPhysicsUpdateCalls.some(([key, value]) => key === 'nodeVisibility' && value === SNAPSHOT.nodeVisibility)).toBe(true);
    expect(nonPhysicsUpdateCalls.some(([key, value]) => key === 'edgeVisibility' && value === SNAPSHOT.edgeVisibility)).toBe(true);
    expect(nonPhysicsUpdateCalls.some(([key, value]) => key === 'pluginOrder' && value === SNAPSHOT.pluginOrder)).toBe(true);
    expect(nonPhysicsUpdateCalls.some(([key, value]) => key === 'disabledPlugins' && value === SNAPSHOT.disabledPlugins)).toBe(true);
  });

  it('updates repo settings without a VS Code config target argument', async () => {
    const mockConfig = createMockConfig({ ...settingsStore });
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);

    const ctx = createMockContext();
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Global,
      ctx,
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    const physicsUpdateCalls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => String(key).startsWith('physics.'));
    for (const call of physicsUpdateCalls) {
      expect(call[2]).toBeUndefined();
    }
  });
});
