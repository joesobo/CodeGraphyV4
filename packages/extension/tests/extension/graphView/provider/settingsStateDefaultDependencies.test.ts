import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/types';

const mocks = vi.hoisted(() => {
  let workspaceFolders: { name: string }[] | undefined = undefined;
  const configuration = {
    get: vi.fn((_: string, fallback: unknown) => fallback),
    inspect: vi.fn(() => undefined),
    update: vi.fn(() => Promise.resolve()),
  };
  const otherConfiguration = {
    update: vi.fn(() => Promise.resolve()),
  };

  return {
    get workspaceFolders(): { name: string }[] | undefined {
      return workspaceFolders;
    },
    set workspaceFolders(value: { name: string }[] | undefined) {
      workspaceFolders = value;
    },
    configuration,
    otherConfiguration,
    getConfiguration: vi.fn((section: string) =>
      section === 'codegraphy' ? configuration : otherConfiguration
    ),
    getConfigTarget: vi.fn(() => 'workspace-target'),
    loadGroupState: vi.fn(() => ({
      userGroups: [],
      hiddenPluginGroupIds: new Set<string>(),
      filterPatterns: [],
    })),
    applyLoadedGroupState: vi.fn(),
    loadDisabledState: vi.fn(() => ({
      disabledRules: new Set<string>(),
      disabledPlugins: new Set<string>(),
      changed: false,
    })),
    sendProviderSettings: vi.fn(),
    sendProviderAllSettings: vi.fn(),
    captureSettingsSnapshot: vi.fn(() => ({ snapshot: true })),
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

vi.mock('../../../../src/extension/graphView/settings/config', () => ({
  getGraphViewConfigTarget: mocks.getConfigTarget,
}));

vi.mock('../../../../src/extension/graphView/groups', () => ({
  loadGraphViewGroupState: mocks.loadGroupState,
}));

vi.mock('../../../../src/extension/graphView/groups/sync', () => ({
  applyLoadedGraphViewGroupState: mocks.applyLoadedGroupState,
}));

vi.mock('../../../../src/extension/graphView/settings/disabled', () => ({
  loadGraphViewDisabledState: mocks.loadDisabledState,
}));

vi.mock('../../../../src/extension/graphView/settings', () => ({
  captureGraphViewSettingsSnapshot: mocks.captureSettingsSnapshot,
}));

vi.mock('../../../../src/extension/graphView/settings/lifecycle', () => ({
  sendGraphViewProviderSettings: mocks.sendProviderSettings,
  sendGraphViewProviderAllSettings: mocks.sendProviderAllSettings,
}));

import {
  createGraphViewProviderSettingsStateMethods,
  createDefaultGraphViewProviderSettingsStateMethodDependencies,
  type GraphViewProviderSettingsStateMethodsSource,
} from '../../../../src/extension/graphView/provider/settingsState';

function createSource(
  overrides: Partial<GraphViewProviderSettingsStateMethodsSource> = {},
): GraphViewProviderSettingsStateMethodsSource {
  const workspaceState = {
    get: vi.fn(),
    update: vi.fn(() => Promise.resolve()),
  };

  const source: GraphViewProviderSettingsStateMethodsSource = {
    _context: { workspaceState },
    _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 } as never,
    _hiddenPluginGroupIds: new Set<string>(['plugin.current']),
    _userGroups: [{ id: 'group.current' } as never],
    _filterPatterns: ['current/**'],
    _disabledRules: new Set<string>(['rule.current']),
    _disabledPlugins: new Set<string>(['plugin.current']),
    _nodeSizeMode: 'connections',
    _analyzer: undefined,
    _computeMergedGroups: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
    _sendMessage: vi.fn(),
    _getPhysicsSettings: vi.fn(() => ({ damping: 1 } as IPhysicsSettings)),
    ...overrides,
  };

  if (!overrides._context) {
    source._context = { workspaceState };
  }

  return source;
}

describe('graphView/provider/settingsState default dependencies', () => {
  beforeEach(() => {
    mocks.workspaceFolders = undefined;
    mocks.configuration.get.mockClear();
    mocks.configuration.inspect.mockClear();
    mocks.configuration.update.mockClear();
    mocks.otherConfiguration.update.mockClear();
    mocks.getConfiguration.mockClear();
    mocks.getConfigTarget.mockClear();
    mocks.loadGroupState.mockReset();
    mocks.applyLoadedGroupState.mockReset();
    mocks.loadDisabledState.mockReset();
    mocks.sendProviderSettings.mockReset();
    mocks.sendProviderAllSettings.mockReset();
    mocks.captureSettingsSnapshot.mockReset();

    mocks.loadGroupState.mockReturnValue({
      userGroups: [],
      hiddenPluginGroupIds: new Set<string>(),
      filterPatterns: [],
    });
    mocks.loadDisabledState.mockReturnValue({
      disabledRules: new Set<string>(),
      disabledPlugins: new Set<string>(),
      changed: false,
    });
    mocks.captureSettingsSnapshot.mockReturnValue({ snapshot: true });
  });

  it('returns the default settings state delegates', () => {
    const dependencies = createDefaultGraphViewProviderSettingsStateMethodDependencies();

    expect(typeof dependencies.getConfiguration).toBe('function');
    expect(typeof dependencies.getWorkspaceFolders).toBe('function');
    expect(typeof dependencies.getConfigTarget).toBe('function');
    expect(dependencies.loadGroupState).toBe(mocks.loadGroupState);
    expect(dependencies.applyLoadedGroupState).toBe(mocks.applyLoadedGroupState);
    expect(dependencies.loadDisabledState).toBe(mocks.loadDisabledState);
    expect(dependencies.sendProviderSettings).toBe(mocks.sendProviderSettings);
    expect(dependencies.sendProviderAllSettings).toBe(mocks.sendProviderAllSettings);
    expect(dependencies.captureSettingsSnapshot).toBe(mocks.captureSettingsSnapshot);
  });

  it('loads groups through the default codegraphy configuration', () => {
    const workspaceFolders = [{ name: 'workspace-folder' }];
    const source = createSource();
    const legacyGroups = [{ id: 'group.legacy' } as never];
    mocks.workspaceFolders = workspaceFolders;
    mocks.applyLoadedGroupState.mockImplementation((_groupState, state, handlers) => {
      handlers.recomputeGroups();
      handlers.persistLegacyGroups(legacyGroups);
      handlers.clearLegacyGroups();
      state.userGroups = [{ id: 'group.updated' } as never];
      state.hiddenPluginGroupIds = new Set<string>(['plugin.updated']);
      state.filterPatterns = ['updated/**'];
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    methods._loadGroupsAndFilterPatterns();

    expect(mocks.getConfiguration).toHaveBeenNthCalledWith(1, 'codegraphy');
    expect(mocks.getConfiguration).toHaveBeenNthCalledWith(2, 'codegraphy');
    expect(mocks.getConfigTarget).toHaveBeenCalledWith(workspaceFolders);
    expect(mocks.configuration.update).toHaveBeenCalledWith(
      'groups',
      legacyGroups,
      'workspace-target',
    );
    expect(mocks.otherConfiguration.update).not.toHaveBeenCalled();
    expect(source._context.workspaceState.update).toHaveBeenCalledWith(
      'codegraphy.groups',
      undefined,
    );
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._userGroups).toEqual([{ id: 'group.updated' }]);
    expect([...source._hiddenPluginGroupIds]).toEqual(['plugin.updated']);
    expect(source._filterPatterns).toEqual(['updated/**']);
  });

  it('loads disabled state through the default configuration inspection', () => {
    const workspaceState = {
      get: vi.fn((key: string) =>
        key === 'codegraphy.disabledRules' ? ['rule.saved'] : ['plugin.saved'],
      ),
      update: vi.fn(() => Promise.resolve()),
    };
    const source = createSource({
      _context: { workspaceState },
    });
    const disabledRulesInspect = { workspaceValue: ['rule.config'] };
    const disabledPluginsInspect = { workspaceValue: ['plugin.config'] };
    mocks.configuration.inspect.mockImplementation((key: string) =>
      key === 'disabledRules' ? disabledRulesInspect : disabledPluginsInspect,
    );
    mocks.loadDisabledState.mockReturnValue({
      disabledRules: new Set<string>(['rule.saved']),
      disabledPlugins: new Set<string>(['plugin.saved']),
      changed: true,
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    expect(methods._loadDisabledRulesAndPlugins()).toBe(true);

    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.configuration.inspect).toHaveBeenNthCalledWith(1, 'disabledRules');
    expect(mocks.configuration.inspect).toHaveBeenNthCalledWith(2, 'disabledPlugins');
    expect(workspaceState.get).toHaveBeenNthCalledWith(1, 'codegraphy.disabledRules');
    expect(workspaceState.get).toHaveBeenNthCalledWith(2, 'codegraphy.disabledPlugins');
    expect(mocks.loadDisabledState).toHaveBeenCalledWith(
      new Set<string>(['rule.current']),
      new Set<string>(['plugin.current']),
      {
        disabledRulesInspect,
        disabledPluginsInspect,
        persistedDisabledRules: ['rule.saved'],
        persistedDisabledPlugins: ['plugin.saved'],
      },
    );
    expect([...source._disabledRules]).toEqual(['rule.saved']);
    expect([...source._disabledPlugins]).toEqual(['plugin.saved']);
  });

  it('sends settings through the default provider message bridge', () => {
    const source = createSource({
      _analyzer: { getPluginFilterPatterns: vi.fn(() => ['plugin/**']) },
    });
    const settingsMessage = {
      type: 'SETTINGS_UPDATED',
      payload: { backgroundColor: '#112233' },
    } as never;
    const allSettingsMessage = {
      type: 'ALL_SETTINGS_UPDATED',
      payload: { backgroundColor: '#445566' },
    } as never;

    mocks.sendProviderSettings.mockImplementation((_viewContext, handlers) => {
      expect(handlers.getConfiguration()).toBe(mocks.configuration);
      handlers.sendMessage(settingsMessage);
    });
    mocks.sendProviderAllSettings.mockImplementation((state, handlers) => {
      expect(state.viewContext).toBe(source._viewContext);
      expect([...state.hiddenPluginGroupIds]).toEqual(['plugin.current']);
      expect(state.userGroups).toEqual([{ id: 'group.current' }]);
      expect(state.filterPatterns).toEqual(['current/**']);
      expect(handlers.captureSettingsSnapshot()).toEqual({ snapshot: true });
      expect(handlers.getPluginFilterPatterns()).toEqual(['plugin/**']);
      handlers.sendMessage(allSettingsMessage);
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      state.hiddenPluginGroupIds = new Set<string>(['plugin.updated']);
      state.userGroups = [{ id: 'group.updated' } as never];
      state.filterPatterns = ['updated/**'];
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    methods._sendSettings();

    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.sendProviderSettings).toHaveBeenCalledOnce();
    expect(mocks.sendProviderAllSettings).not.toHaveBeenCalled();
    expect(source._sendMessage).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith(settingsMessage);
  });

  it('sends all settings through the default snapshot bridge', () => {
    const source = createSource({
      _analyzer: { getPluginFilterPatterns: vi.fn(() => ['plugin/**']) },
    });
    const allSettingsMessage = {
      type: 'ALL_SETTINGS_UPDATED',
      payload: { backgroundColor: '#445566' },
    } as never;

    mocks.sendProviderAllSettings.mockImplementation((state, handlers) => {
      expect(state.viewContext).toBe(source._viewContext);
      expect([...state.hiddenPluginGroupIds]).toEqual(['plugin.current']);
      expect(state.userGroups).toEqual([{ id: 'group.current' }]);
      expect(state.filterPatterns).toEqual(['current/**']);
      expect(handlers.captureSettingsSnapshot()).toEqual({ snapshot: true });
      expect(handlers.getPluginFilterPatterns()).toEqual(['plugin/**']);
      handlers.sendMessage(allSettingsMessage);
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      state.hiddenPluginGroupIds = new Set<string>(['plugin.updated']);
      state.userGroups = [{ id: 'group.updated' } as never];
      state.filterPatterns = ['updated/**'];
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    methods._sendAllSettings();

    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.sendProviderSettings).not.toHaveBeenCalled();
    expect(mocks.sendProviderAllSettings).toHaveBeenCalledOnce();
    expect(mocks.captureSettingsSnapshot).toHaveBeenCalledWith(
      mocks.configuration,
      { damping: 1 },
      'connections',
    );
    expect(source._sendMessage).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith(allSettingsMessage);
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect([...source._hiddenPluginGroupIds]).toEqual(['plugin.updated']);
    expect(source._userGroups).toEqual([{ id: 'group.updated' }]);
    expect(source._filterPatterns).toEqual(['updated/**']);
  });
});
