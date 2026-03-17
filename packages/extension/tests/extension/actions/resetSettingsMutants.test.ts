/**
 * @fileoverview Additional tests for ResetSettingsAction targeting surviving mutants.
 *
 * Surviving mutants:
 * - L62:54 StringLiteral: config section 'codegraphy.physics' in execute
 * - L81:54 StringLiteral: config section 'codegraphy.physics' in undo
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

function createMockConfig() {
  return {
    get: vi.fn(),
    update: vi.fn().mockResolvedValue(undefined),
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

  let mockPhysicsConfig: vscode.WorkspaceConfiguration;
  let mockCodegraphyConfig: vscode.WorkspaceConfiguration;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPhysicsConfig = createMockConfig();
    mockCodegraphyConfig = createMockConfig();

    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });
  });

  it('calls getConfiguration with codegraphy.physics during execute', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    // Verify it was called with the exact string 'codegraphy.physics'
    const calls = vi.mocked(vscode.workspace.getConfiguration).mock.calls;
    const physicsCall = calls.find(call => call[0] === 'codegraphy.physics');
    expect(physicsCall).toBeDefined();
  });

  it('calls getConfiguration with codegraphy during execute', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    const calls = vi.mocked(vscode.workspace.getConfiguration).mock.calls;
    const codegraphyCall = calls.find(call => call[0] === 'codegraphy');
    expect(codegraphyCall).toBeDefined();
  });

  it('calls getConfiguration with codegraphy.physics during undo', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();
    vi.mocked(vscode.workspace.getConfiguration).mockClear();
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    await action.undo();

    const calls = vi.mocked(vscode.workspace.getConfiguration).mock.calls;
    const physicsCall = calls.find(call => call[0] === 'codegraphy.physics');
    expect(physicsCall).toBeDefined();
  });

  it('calls getConfiguration with codegraphy during undo', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();
    vi.mocked(vscode.workspace.getConfiguration).mockClear();
    vi.mocked(vscode.workspace.getConfiguration).mockImplementation((section?: string) => {
      if (section === 'codegraphy.physics') return mockPhysicsConfig;
      return mockCodegraphyConfig;
    });

    await action.undo();

    const calls = vi.mocked(vscode.workspace.getConfiguration).mock.calls;
    const codegraphyCall = calls.find(call => call[0] === 'codegraphy');
    expect(codegraphyCall).toBeDefined();
  });

  it('uses physics config for physics keys and codegraphy config for other keys during execute', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    // Physics keys should be updated on the physics config
    const physicsUpdateCalls = (mockPhysicsConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    const physicsKeys = physicsUpdateCalls.map(call => call[0]);
    expect(physicsKeys).toContain('repelForce');
    expect(physicsKeys).toContain('linkDistance');
    expect(physicsKeys).toContain('linkForce');
    expect(physicsKeys).toContain('damping');
    expect(physicsKeys).toContain('centerForce');

    // Non-physics keys should be updated on the codegraphy config
    const cgUpdateCalls = (mockCodegraphyConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    const cgKeys = cgUpdateCalls.map(call => call[0]);
    expect(cgKeys).toContain('groups');
    expect(cgKeys).toContain('showOrphans');
    expect(cgKeys).not.toContain('repelForce');
  });

  it('uses physics config for physics keys and codegraphy config for other keys during undo', async () => {
    const action = new ResetSettingsAction(
      SNAPSHOT,
      vscode.ConfigurationTarget.Workspace,
      createMockContext(),
      vi.fn(),
      vi.fn(),
      vi.fn().mockResolvedValue(undefined),
    );

    await action.execute();

    // Clear to isolate undo calls
    (mockPhysicsConfig.update as ReturnType<typeof vi.fn>).mockClear();
    (mockCodegraphyConfig.update as ReturnType<typeof vi.fn>).mockClear();

    await action.undo();

    // Physics keys should be restored on the physics config
    const physicsUpdateCalls = (mockPhysicsConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    const physicsKeys = physicsUpdateCalls.map(call => call[0]);
    expect(physicsKeys).toContain('repelForce');
    expect(physicsKeys).toContain('damping');

    // Non-physics keys should be restored on the codegraphy config
    const cgUpdateCalls = (mockCodegraphyConfig.update as ReturnType<typeof vi.fn>).mock.calls;
    const cgKeys = cgUpdateCalls.map(call => call[0]);
    expect(cgKeys).toContain('groups');
    expect(cgKeys).toContain('showOrphans');
    expect(cgKeys).not.toContain('repelForce');
  });
});
