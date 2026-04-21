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
  } as unknown as vscode.ExtensionContext;
}

describe('ResetSettingsAction (config section mutant coverage)', () => {
  const SNAPSHOT: ISettingsSnapshot = {
    physics: { repelForce: 10, linkDistance: 100, linkForce: 0.2, damping: 0.5, centerForce: 0.3 },
    legends: [],
    filterPatterns: [],
    disabledCustomFilterPatterns: [],
    disabledPluginFilterPatterns: [],
    showOrphans: true,
    bidirectionalMode: 'separate',
    directionMode: 'arrows',
    directionColor: '#000000',
    nodeColors: { file: '#111111', folder: '#222222' },
    nodeColorEnabled: { file: true, folder: true },
    nodeVisibility: { file: true, folder: false },
    edgeVisibility: { imports: true, calls: false },
    legendVisibility: {},
    legendOrder: [],
    pluginOrder: ['codegraphy.markdown'],
    disabledPlugins: ['codegraphy.python'],
    particleSpeed: 0.001,
    particleSize: 4,
    showLabels: true,
    maxFiles: 500,
    nodeSizeMode: 'connections',
  };

  let settingsStore: Record<string, unknown>;
  let mockConfig: vscode.WorkspaceConfiguration;

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
      nodeColors: { file: '#111111', folder: '#222222' },
      nodeColorEnabled: { file: true, folder: true },
      nodeVisibility: { file: true, folder: false },
      edgeVisibility: { imports: true, calls: false },
      legendVisibility: {},
      legendOrder: [],
      pluginOrder: ['codegraphy.markdown'],
      disabledPlugins: ['codegraphy.python'],
      particleSpeed: 0.001,
      particleSize: 4,
      showLabels: true,
      maxFiles: 500,
      nodeSizeMode: 'connections',
    };
    mockConfig = createMockConfig(settingsStore);
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue(mockConfig);
  });

  it('resets physics keys through the repo-local config during execute', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    const calls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => String(key).startsWith('physics.'));
    expect(calls.map(call => call[0])).toEqual([
      'physics.repelForce',
      'physics.linkDistance',
      'physics.linkForce',
      'physics.damping',
      'physics.centerForce',
    ]);
    for (const call of calls) {
      expect(call[1]).toBeUndefined();
    }
  });

  it('resets non-physics keys through the same repo-local config during execute', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    const calls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => !String(key).startsWith('physics.'));
    const keys = calls.map(call => call[0]);
    expect(keys).toContain('legend');
    expect(keys).toContain('showOrphans');
    expect(keys).toContain('bidirectionalEdges');
    expect(keys).toContain('nodeColors');
    expect(keys).toContain('nodeVisibility');
    expect(keys).toContain('edgeVisibility');
    expect(keys).toContain('pluginOrder');
    expect(keys).toContain('disabledPlugins');
    expect(keys).toContain('nodeSizeMode');
    for (const call of calls) {
      if (call[0] === 'nodeSizeMode') {
        expect(call[1]).toBe('connections');
        continue;
      }

      expect(call[1]).toBeUndefined();
    }
  });

  it('restores physics values through the repo-local config during undo', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();
    (mockConfig.update as ReturnType<typeof vi.fn>).mockClear();

    await action.undo();

    const calls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls
      .filter(([key]) => String(key).startsWith('physics.'));
    expect(calls.map(call => call[0])).toContain('physics.repelForce');
    expect(calls.map(call => call[0])).toContain('physics.damping');
    expect(calls.some(call => call[1] === SNAPSHOT.physics.repelForce)).toBe(true);
    expect(calls.some(call => call[1] === SNAPSHOT.physics.damping)).toBe(true);
  });

  it('updates repo settings without a VS Code target in execute and undo', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();
    let calls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.every(call => call[2] === undefined)).toBe(true);

    (mockConfig.update as ReturnType<typeof vi.fn>).mockClear();
    await action.undo();
    calls = (mockConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.every(call => call[2] === undefined)).toBe(true);
  });
});
