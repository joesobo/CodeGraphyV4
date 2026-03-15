import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../src/shared/types';
import { createGraphViewProviderSettingsMethods } from '../../../src/extension/graphView/providerSettingsMethods';

describe('graphView/providerSettingsMethods', () => {
  it('loads groups and filter patterns and syncs the result onto the provider source', () => {
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 },
      _hiddenPluginGroupIds: new Set<string>(),
      _userGroups: [],
      _filterPatterns: [],
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _nodeSizeMode: 'connections' as const,
      _analyzer: undefined,
      _computeMergedGroups: vi.fn(),
      _sendGroupsUpdated: vi.fn(),
      _sendMessage: vi.fn(),
    };
    const methods = createGraphViewProviderSettingsMethods(source as never, {
      getConfiguration: vi.fn(() => ({ get: vi.fn(), inspect: vi.fn(), update: vi.fn(() => Promise.resolve()) })),
      getWorkspaceFolders: vi.fn(() => []),
      getConfigTarget: vi.fn(() => 'workspace'),
      loadGroupState: vi.fn(() => ({ groups: ['raw'], hiddenPluginGroupIds: ['plugin.group'], filterPatterns: ['dist/**'] })),
      applyLoadedGroupState: vi.fn((_groupState, state) => {
        state.userGroups = [{ id: 'group-1' }];
        state.hiddenPluginGroupIds = new Set<string>(['plugin.group']);
        state.filterPatterns = ['dist/**'];
      }),
      loadDisabledState: vi.fn(),
      sendProviderSettings: vi.fn(),
      sendProviderAllSettings: vi.fn(),
      captureSettingsSnapshot: vi.fn(),
      readPhysicsSettings: vi.fn(),
      updatePhysicsSetting: vi.fn(),
      resetPhysicsSettings: vi.fn(),
      defaultPhysics: {} as IPhysicsSettings,
    });

    methods._loadGroupsAndFilterPatterns();

    expect(source._userGroups).toEqual([{ id: 'group-1' }]);
    expect([...source._hiddenPluginGroupIds]).toEqual(['plugin.group']);
    expect(source._filterPatterns).toEqual(['dist/**']);
  });

  it('loads disabled rules and plugins and reports whether anything changed', () => {
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn((key: string) => (key.includes('Rules') ? ['rule.saved'] : ['plugin.saved'])),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 },
      _hiddenPluginGroupIds: new Set<string>(),
      _userGroups: [],
      _filterPatterns: [],
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _nodeSizeMode: 'connections' as const,
      _analyzer: undefined,
      _computeMergedGroups: vi.fn(),
      _sendGroupsUpdated: vi.fn(),
      _sendMessage: vi.fn(),
    };
    const methods = createGraphViewProviderSettingsMethods(source as never, {
      getConfiguration: vi.fn(() => ({
        get: vi.fn(),
        inspect: vi.fn(() => undefined),
        update: vi.fn(() => Promise.resolve()),
      })),
      getWorkspaceFolders: vi.fn(() => []),
      getConfigTarget: vi.fn(() => 'workspace'),
      loadGroupState: vi.fn(),
      applyLoadedGroupState: vi.fn(),
      loadDisabledState: vi.fn(() => ({
        disabledRules: new Set<string>(['rule.saved']),
        disabledPlugins: new Set<string>(['plugin.saved']),
        changed: true,
      })),
      sendProviderSettings: vi.fn(),
      sendProviderAllSettings: vi.fn(),
      captureSettingsSnapshot: vi.fn(),
      readPhysicsSettings: vi.fn(),
      updatePhysicsSetting: vi.fn(),
      resetPhysicsSettings: vi.fn(),
      defaultPhysics: {} as IPhysicsSettings,
    });

    expect(methods._loadDisabledRulesAndPlugins()).toBe(true);
    expect([...source._disabledRules]).toEqual(['rule.saved']);
    expect([...source._disabledPlugins]).toEqual(['plugin.saved']);
  });

  it('sends settings snapshots and physics updates through the helper dependencies', async () => {
    const sendProviderSettings = vi.fn();
    const sendProviderAllSettings = vi.fn((state) => {
      state.hiddenPluginGroupIds = new Set<string>(['plugin.updated']);
      state.userGroups = [{ id: 'group.updated' }];
      state.filterPatterns = ['src/**'];
    });
    const updatePhysicsSetting = vi.fn(async () => undefined);
    const resetPhysicsSettings = vi.fn(async () => undefined);
    const source = {
      _context: {
        workspaceState: {
          get: vi.fn(),
          update: vi.fn(() => Promise.resolve()),
        },
      },
      _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 },
      _hiddenPluginGroupIds: new Set<string>(),
      _userGroups: [],
      _filterPatterns: [],
      _disabledRules: new Set<string>(),
      _disabledPlugins: new Set<string>(),
      _nodeSizeMode: 'connections' as const,
      _analyzer: { getPluginFilterPatterns: vi.fn(() => ['plugin/**']) },
      _computeMergedGroups: vi.fn(),
      _sendGroupsUpdated: vi.fn(),
      _sendMessage: vi.fn(),
    };
    const methods = createGraphViewProviderSettingsMethods(source as never, {
      getConfiguration: vi.fn(() => ({ get: vi.fn((_, fallback) => fallback), inspect: vi.fn(), update: vi.fn(() => Promise.resolve()) })),
      getWorkspaceFolders: vi.fn(() => []),
      getConfigTarget: vi.fn(() => 'workspace'),
      loadGroupState: vi.fn(),
      applyLoadedGroupState: vi.fn(),
      loadDisabledState: vi.fn(),
      sendProviderSettings,
      sendProviderAllSettings,
      captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
      readPhysicsSettings: vi.fn(() => ({ damping: 1 } as IPhysicsSettings)),
      updatePhysicsSetting,
      resetPhysicsSettings,
      defaultPhysics: {} as IPhysicsSettings,
    });

    methods._sendSettings();
    methods._sendPhysicsSettings();
    methods._sendAllSettings();
    await methods._updatePhysicsSetting('damping', 0.4);
    await methods._resetPhysicsSettings();

    expect(sendProviderSettings).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'PHYSICS_SETTINGS_UPDATED',
      payload: { damping: 1 },
    });
    expect(sendProviderAllSettings).toHaveBeenCalledOnce();
    expect([...source._hiddenPluginGroupIds]).toEqual(['plugin.updated']);
    expect(source._userGroups).toEqual([{ id: 'group.updated' }]);
    expect(source._filterPatterns).toEqual(['src/**']);
    expect(updatePhysicsSetting).toHaveBeenCalledOnce();
    expect(resetPhysicsSettings).toHaveBeenCalledOnce();
  });
});
