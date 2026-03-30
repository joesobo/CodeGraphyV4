import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import { createGraphViewProviderPhysicsSettingsMethods } from '../../../../src/extension/graphView/provider/physicsSettings';

describe('graphView/provider/physicsSettings', () => {
  it('reads and sends current physics settings through the provider message bridge', () => {
    const readPhysicsSettings = vi.fn(() => ({ damping: 1 } as IPhysicsSettings));
    const source = { _sendMessage: vi.fn() };
    const configuration = {
      get: vi.fn((_, fallback) => fallback),
      update: vi.fn(async () => undefined),
    };
    const getConfiguration = vi.fn(() => configuration);
    const methods = createGraphViewProviderPhysicsSettingsMethods(source as never, {
      getConfiguration,
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
    expect(getConfiguration).toHaveBeenNthCalledWith(1, 'codegraphy.physics');
    expect(getConfiguration).toHaveBeenNthCalledWith(2, 'codegraphy.physics');
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: { damping: 1 },
    });
  });

  it('updates physics settings through the current config and workspace-target helpers', async () => {
    const configuration = {
      get: vi.fn((_, fallback) => fallback),
      update: vi.fn(async () => undefined),
    };
    const workspaceFolders = [{ name: 'workspace-folder' }] as never;
    const getConfiguration = vi.fn(() => configuration);
    const getWorkspaceFolders = vi.fn(() => workspaceFolders);
    const getConfigTarget = vi.fn(() => 'workspace-folder');
    const updatePhysicsSetting = vi.fn(async () => undefined);
    const methods = createGraphViewProviderPhysicsSettingsMethods(
      { _sendMessage: vi.fn() } as never,
      {
        getConfiguration,
        getWorkspaceFolders,
        getConfigTarget,
        readPhysicsSettings: vi.fn(() => ({ damping: 1 } as IPhysicsSettings)),
        updatePhysicsSetting,
        resetPhysicsSettings: vi.fn(async () => undefined),
        defaultPhysics: {} as IPhysicsSettings,
      },
    );

    await methods._updatePhysicsSetting('damping', 0.4);

    expect(updatePhysicsSetting).toHaveBeenCalledOnce();
    const options = updatePhysicsSetting.mock.calls[0] as unknown as [
      unknown,
      unknown,
      {
        getConfiguration(): unknown;
        getConfigTarget(): unknown;
      },
    ];
    expect(options[2].getConfiguration()).toBe(configuration);
    expect(options[2].getConfigTarget()).toBe('workspace-folder');
    expect(getConfiguration).toHaveBeenCalledWith('codegraphy.physics');
    expect(getWorkspaceFolders).toHaveBeenCalledOnce();
    expect(getConfigTarget).toHaveBeenCalledWith(workspaceFolders);
  });

  it('resets physics settings through the current config and workspace-target helpers', async () => {
    const configuration = {
      get: vi.fn((_, fallback) => fallback),
      update: vi.fn(async () => undefined),
    };
    const workspaceFolders = [{ name: 'workspace-folder' }] as never;
    const getConfiguration = vi.fn(() => configuration);
    const getWorkspaceFolders = vi.fn(() => workspaceFolders);
    const getConfigTarget = vi.fn(() => 'workspace-folder');
    const resetPhysicsSettings = vi.fn(async () => undefined);
    const methods = createGraphViewProviderPhysicsSettingsMethods(
      { _sendMessage: vi.fn() } as never,
      {
        getConfiguration,
        getWorkspaceFolders,
        getConfigTarget,
        readPhysicsSettings: vi.fn(() => ({ damping: 1 } as IPhysicsSettings)),
        updatePhysicsSetting: vi.fn(async () => undefined),
        resetPhysicsSettings,
        defaultPhysics: {} as IPhysicsSettings,
      },
    );

    await methods._resetPhysicsSettings();

    expect(resetPhysicsSettings).toHaveBeenCalledOnce();
    const options = resetPhysicsSettings.mock.calls[0] as unknown as [
      {
        getConfiguration(): unknown;
        getConfigTarget(): unknown;
      },
    ];
    expect(options[0].getConfiguration()).toBe(configuration);
    expect(options[0].getConfigTarget()).toBe('workspace-folder');
    expect(getConfiguration).toHaveBeenCalledWith('codegraphy.physics');
    expect(getWorkspaceFolders).toHaveBeenCalledOnce();
    expect(getConfigTarget).toHaveBeenCalledWith(workspaceFolders);
  });
});
