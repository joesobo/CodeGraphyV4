/**
 * @fileoverview Additional tests for ResetSettingsAction targeting surviving mutants.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ResetSettingsAction } from '../../../src/extension/actions/resetSettings';
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
  let physicsStore: Record<string, unknown>;
  let codegraphyStore: Record<string, unknown>;

  const SNAPSHOT: ISettingsSnapshot = {
    physics: { repelForce: 10, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 },
    groups: [],
    filterPatterns: [],
    showOrphans: true,
    bidirectionalMode: 'separate',
    directionMode: 'arrows',
    directionColor: '#000000',
    folderNodeColor: '#FFFFFF',
    particleSpeed: 0.001,
    particleSize: 4,
    showLabels: true,
    maxFiles: 500,
    hiddenPluginGroups: [],
    nodeSizeMode: 'connections',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    physicsStore = { ...SNAPSHOT.physics };
    codegraphyStore = {
      groups: [],
      filterPatterns: [],
      showOrphans: true,
      bidirectionalEdges: 'separate',
      directionMode: 'arrows',
      directionColor: '#000000',
      folderNodeColor: '#FFFFFF',
      particleSpeed: 0.001,
      particleSize: 4,
      showLabels: true,
      maxFiles: 500,
      hiddenPluginGroups: [],
    };
  });

  it('resets all five physics keys to undefined during execute', async () => {
    const mockPhysicsConfig = createMockConfig(physicsStore);
    const mockCodegraphyConfig = createMockConfig(codegraphyStore);
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

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

    const physicsUpdateCalls = (mockPhysicsConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    const updatedKeys = physicsUpdateCalls.map((call) => call[0]);
    expect(updatedKeys).toContain('repelForce');
    expect(updatedKeys).toContain('linkDistance');
    expect(updatedKeys).toContain('linkForce');
    expect(updatedKeys).toContain('damping');
    expect(updatedKeys).toContain('centerForce');

    // All values should be undefined
    for (const call of physicsUpdateCalls) {
      expect(call[1]).toBeUndefined();
    }
  });

  it('resets all CONFIG_TO_SNAPSHOT config keys to undefined during execute', async () => {
    const mockPhysicsConfig = createMockConfig(physicsStore);
    const mockCodegraphyConfig = createMockConfig(codegraphyStore);
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

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

    const cgUpdateCalls = (mockCodegraphyConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    const updatedKeys = cgUpdateCalls.map((call) => call[0]);
    expect(updatedKeys).toContain('groups');
    expect(updatedKeys).toContain('filterPatterns');
    expect(updatedKeys).toContain('showOrphans');
    expect(updatedKeys).toContain('bidirectionalEdges');
    expect(updatedKeys).toContain('directionMode');
    expect(updatedKeys).toContain('directionColor');
    expect(updatedKeys).toContain('folderNodeColor');
    expect(updatedKeys).toContain('particleSpeed');
    expect(updatedKeys).toContain('particleSize');
    expect(updatedKeys).toContain('showLabels');
    expect(updatedKeys).toContain('maxFiles');
    expect(updatedKeys).toContain('hiddenPluginGroups');
  });

  it('undo restores each physics key to its original value', async () => {
    const originalPhysics = { repelForce: 10, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 };
    const mockPhysicsConfig = createMockConfig({ ...physicsStore });
    const mockCodegraphyConfig = createMockConfig({ ...codegraphyStore });
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

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
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    await action.undo();

    const physicsUpdateCalls = (mockPhysicsConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of physicsUpdateCalls) {
      const key = call[0] as keyof typeof originalPhysics;
      expect(call[1]).toBe(originalPhysics[key]);
    }
  });

  it('uses the correct config target in execute and undo', async () => {
    const mockPhysicsConfig = createMockConfig({ ...physicsStore });
    const mockCodegraphyConfig = createMockConfig({ ...codegraphyStore });
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

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

    const physicsUpdateCalls = (mockPhysicsConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of physicsUpdateCalls) {
      expect(call[2]).toBe(vscode.ConfigurationTarget.Global);
    }
  });
});
