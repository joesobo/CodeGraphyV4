import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const configuration = { get: vi.fn((_: string, fallback: unknown) => fallback) };

  return {
    configuration,
    readPhysicsSettings: vi.fn(() => ({ damping: 0.6 })),
    updatePhysicsSetting: vi.fn(async () => undefined),
    resetPhysicsSettings: vi.fn(async () => undefined),
    getCodeGraphyConfiguration: vi.fn(() => configuration),
  };
});

vi.mock('vscode', () => ({
  workspace: {},
}));

vi.mock('../../../../src/extension/graphView/settings/physics/reader', () => ({
  readGraphViewPhysicsSettings: mocks.readPhysicsSettings,
}));

vi.mock('../../../../src/extension/repoSettings/current', () => ({
  getCodeGraphyConfiguration: mocks.getCodeGraphyConfiguration,
}));

vi.mock('../../../../src/extension/graphView/settings/physics/updates', () => ({
  updateGraphViewPhysicsSetting: mocks.updatePhysicsSetting,
  resetGraphViewPhysicsSettings: mocks.resetPhysicsSettings,
}));

import { createGraphViewProviderPhysicsSettingsMethods } from '../../../../src/extension/graphView/provider/physicsSettings';

describe('graphView/provider/physicsSettings default dependencies', () => {
  beforeEach(() => {
    mocks.getCodeGraphyConfiguration.mockClear();
    mocks.configuration.get.mockClear();
    mocks.readPhysicsSettings.mockClear();
    mocks.updatePhysicsSetting.mockClear();
    mocks.resetPhysicsSettings.mockClear();
  });

  it('reads and sends physics settings through the default vscode configuration bridge', () => {
    const source = { _sendMessage: vi.fn() };
    const methods = createGraphViewProviderPhysicsSettingsMethods(source as never);

    expect(methods._getPhysicsSettings()).toEqual({ damping: 0.6 });
    methods._sendPhysicsSettings();

    expect(mocks.getCodeGraphyConfiguration).toHaveBeenCalledTimes(2);
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

  it('updates physics settings through the default repo-local settings helpers', async () => {
    const methods = createGraphViewProviderPhysicsSettingsMethods({ _sendMessage: vi.fn() } as never);

    await methods._updatePhysicsSetting('damping', 0.25);

    expect(mocks.updatePhysicsSetting).toHaveBeenCalledOnce();
    const options = mocks.updatePhysicsSetting.mock.calls[0] as unknown as [
      unknown,
      unknown,
      {
        getConfiguration(): unknown;
      },
    ];
    expect(options[2].getConfiguration()).toBe(mocks.configuration);
    expect(mocks.getCodeGraphyConfiguration).toHaveBeenCalledOnce();
  });

  it('resets physics settings through the default repo-local settings helpers', async () => {
    const methods = createGraphViewProviderPhysicsSettingsMethods({ _sendMessage: vi.fn() } as never);

    await methods._resetPhysicsSettings();

    expect(mocks.resetPhysicsSettings).toHaveBeenCalledOnce();
    const options = mocks.resetPhysicsSettings.mock.calls[0] as unknown as [
      {
        getConfiguration(): unknown;
      },
    ];
    expect(options[0].getConfiguration()).toBe(mocks.configuration);
    expect(mocks.getCodeGraphyConfiguration).toHaveBeenCalledOnce();
  });
});
