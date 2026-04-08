import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  let workspaceFolders: { name: string }[] | undefined = undefined;
  const configuration = { get: vi.fn((_: string, fallback: unknown) => fallback) };

  return {
    get workspaceFolders(): { name: string }[] | undefined {
      return workspaceFolders;
    },
    set workspaceFolders(value: { name: string }[] | undefined) {
      workspaceFolders = value;
    },
    getConfiguration: vi.fn(() => configuration),
    configuration,
    readPhysicsSettings: vi.fn(() => ({ damping: 0.6 })),
    getConfigTarget: vi.fn(() => 'workspace-target'),
    updatePhysicsSetting: vi.fn(async () => undefined),
    resetPhysicsSettings: vi.fn(async () => undefined),
  };
});

vi.mock('vscode', () => ({
  workspace: {
    get workspaceFolders() {
      return mocks.workspaceFolders;
    },
    getConfiguration: mocks.getConfiguration,
  },
}));

vi.mock('../../../../src/extension/graphView/settings/physics/reader', () => ({
  readGraphViewPhysicsSettings: mocks.readPhysicsSettings,
}));

vi.mock('../../../../src/extension/graphView/settings/reader', () => ({
  getGraphViewConfigTarget: mocks.getConfigTarget,
}));

vi.mock('../../../../src/extension/graphView/settings/physics/updates', () => ({
  updateGraphViewPhysicsSetting: mocks.updatePhysicsSetting,
  resetGraphViewPhysicsSettings: mocks.resetPhysicsSettings,
}));

import { createGraphViewProviderPhysicsSettingsMethods } from '../../../../src/extension/graphView/provider/physicsSettings';

describe('graphView/provider/physicsSettings default dependencies', () => {
  beforeEach(() => {
    mocks.workspaceFolders = undefined;
    mocks.getConfiguration.mockClear();
    mocks.configuration.get.mockClear();
    mocks.readPhysicsSettings.mockClear();
    mocks.getConfigTarget.mockClear();
    mocks.updatePhysicsSetting.mockClear();
    mocks.resetPhysicsSettings.mockClear();
  });

  it('reads and sends physics settings through the default vscode configuration bridge', () => {
    const source = { _sendMessage: vi.fn() };
    const methods = createGraphViewProviderPhysicsSettingsMethods(source as never);

    expect(methods._getPhysicsSettings()).toEqual({ damping: 0.6 });
    methods._sendPhysicsSettings();

    expect(mocks.getConfiguration).toHaveBeenNthCalledWith(1, 'codegraphy');
    expect(mocks.getConfiguration).toHaveBeenNthCalledWith(2, 'codegraphy');
    expect(mocks.readPhysicsSettings).toHaveBeenNthCalledWith(
      1,
      mocks.configuration,
      {
        repelForce: 10,
        linkDistance: 80,
        linkForce: 0.15,
        damping: 0.7,
        centerForce: 0.1,
      },
    );
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: { damping: 0.6 },
    });
  });

  it('updates physics settings through the default config-target helpers', async () => {
    const workspaceFolders = [{ name: 'workspace-folder' }];
    mocks.workspaceFolders = workspaceFolders;
    const methods = createGraphViewProviderPhysicsSettingsMethods({ _sendMessage: vi.fn() } as never);

    await methods._updatePhysicsSetting('damping', 0.25);

    expect(mocks.updatePhysicsSetting).toHaveBeenCalledOnce();
    const options = mocks.updatePhysicsSetting.mock.calls[0] as unknown as [
      unknown,
      unknown,
      {
        getConfiguration(): unknown;
        getConfigTarget(): unknown;
      },
    ];
    expect(options[2].getConfiguration()).toBe(mocks.configuration);
    expect(options[2].getConfigTarget()).toBe('workspace-target');
    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.getConfigTarget).toHaveBeenCalledWith(workspaceFolders);
  });

  it('resets physics settings through the default config-target helpers', async () => {
    const workspaceFolders = [{ name: 'workspace-folder' }];
    mocks.workspaceFolders = workspaceFolders;
    const methods = createGraphViewProviderPhysicsSettingsMethods({ _sendMessage: vi.fn() } as never);

    await methods._resetPhysicsSettings();

    expect(mocks.resetPhysicsSettings).toHaveBeenCalledOnce();
    const options = mocks.resetPhysicsSettings.mock.calls[0] as unknown as [
      {
        getConfiguration(): unknown;
        getConfigTarget(): unknown;
      },
    ];
    expect(options[0].getConfiguration()).toBe(mocks.configuration);
    expect(options[0].getConfigTarget()).toBe('workspace-target');
    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.getConfigTarget).toHaveBeenCalledWith(workspaceFolders);
  });
});
