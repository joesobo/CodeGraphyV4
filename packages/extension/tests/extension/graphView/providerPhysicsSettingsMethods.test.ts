import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../src/shared/types';
import { createGraphViewProviderPhysicsSettingsMethods } from '../../../src/extension/graphView/providerPhysicsSettingsMethods';

describe('graphView/providerPhysicsSettingsMethods', () => {
  it('reads and sends current physics settings through the provider message bridge', () => {
    const readPhysicsSettings = vi.fn(() => ({ damping: 1 } as IPhysicsSettings));
    const source = { _sendMessage: vi.fn() };
    const methods = createGraphViewProviderPhysicsSettingsMethods(source as never, {
      getConfiguration: vi.fn(() => ({ get: vi.fn((_, fallback) => fallback) })),
      getWorkspaceFolders: vi.fn(() => []),
      getConfigTarget: vi.fn(() => 'workspace'),
      readPhysicsSettings,
      updatePhysicsSetting: vi.fn(),
      resetPhysicsSettings: vi.fn(),
      defaultPhysics: {} as IPhysicsSettings,
    });

    expect(methods._getPhysicsSettings()).toEqual({ damping: 1 });
    methods._sendPhysicsSettings();

    expect(readPhysicsSettings).toHaveBeenCalledTimes(2);
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: { damping: 1 },
    });
  });

  it('updates and resets physics settings through the config-target helpers', async () => {
    const updatePhysicsSetting = vi.fn(async () => undefined);
    const resetPhysicsSettings = vi.fn(async () => undefined);
    const methods = createGraphViewProviderPhysicsSettingsMethods(
      { _sendMessage: vi.fn() } as never,
      {
        getConfiguration: vi.fn(() => ({ get: vi.fn((_, fallback) => fallback) })),
        getWorkspaceFolders: vi.fn(() => []),
        getConfigTarget: vi.fn(() => 'workspace'),
        readPhysicsSettings: vi.fn(() => ({ damping: 1 } as IPhysicsSettings)),
        updatePhysicsSetting,
        resetPhysicsSettings,
        defaultPhysics: {} as IPhysicsSettings,
      },
    );

    await methods._updatePhysicsSetting('damping', 0.4);
    await methods._resetPhysicsSettings();

    expect(updatePhysicsSetting).toHaveBeenCalledOnce();
    expect(resetPhysicsSettings).toHaveBeenCalledOnce();
  });
});
