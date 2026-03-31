import { describe, expect, it, vi } from 'vitest';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';
import {
  createGraphViewProviderSettingsStateMethods,
  type GraphViewProviderSettingsStateMethodDependencies,
  type GraphViewProviderSettingsStateMethodsSource,
} from '../../../../src/extension/graphView/provider/settingsState';
import { sendGraphViewProviderAllSettings } from '../../../../src/extension/graphView/settings/lifecycle';

type WorkspaceStateGetMock = ReturnType<typeof vi.fn> & (<T>(key: string) => T | undefined);

function createSource(
  overrides: Partial<GraphViewProviderSettingsStateMethodsSource> = {},
): GraphViewProviderSettingsStateMethodsSource {
  const get = vi.fn((key: string) => {
    if (key === 'codegraphy.groups') return undefined;
    if (key === 'codegraphy.disabledRules') return ['rule.saved'];
    if (key === 'codegraphy.disabledPlugins') return ['plugin.saved'];
    return undefined;
  }) as WorkspaceStateGetMock;
  const workspaceState = {
    get,
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

function createDependencies(
  overrides: Partial<GraphViewProviderSettingsStateMethodDependencies> = {},
): {
  configuration: {
    get: ReturnType<typeof vi.fn>;
    inspect: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  dependencies: GraphViewProviderSettingsStateMethodDependencies;
} {
  const configuration = {
    get: vi.fn((_, fallback) => fallback),
    inspect: vi.fn(() => undefined),
    update: vi.fn(() => Promise.resolve()),
  };

  return {
    configuration,
    dependencies: {
      getConfiguration: vi.fn(() => configuration),
      getWorkspaceFolders: vi.fn(() => []),
      getConfigTarget: vi.fn(() => 'workspace'),
      loadGroupState: vi.fn(() => ({
        userGroups: [],
        hiddenPluginGroupIds: new Set<string>(),
        filterPatterns: [],
      }) as never),
      applyLoadedGroupState: vi.fn(),
      loadDisabledState: vi.fn(() => ({
        disabledRules: new Set<string>(),
        disabledPlugins: new Set<string>(),
        changed: false,
      })),
      sendProviderSettings: vi.fn(),
      sendProviderAllSettings: vi.fn(),
      captureSettingsSnapshot: vi.fn(() => ({ snapshot: true }) as never),
      ...overrides,
    },
  };
}

describe('graphView/provider/settingsState', () => {
  it('loads groups and filter patterns from persisted state and seeds the sync state', () => {
    const source = createSource();
    const groupState = {
      userGroups: [{ id: 'group.saved' } as never],
      hiddenPluginGroupIds: new Set<string>(['plugin.saved']),
      filterPatterns: ['dist/**'],
    } as never;
    const { configuration, dependencies } = createDependencies({
      loadGroupState: vi.fn(() => groupState),
      applyLoadedGroupState: vi.fn((loadedGroupState, state, handlers) => {
        expect(loadedGroupState).toBe(groupState);
        expect(state.userGroups).toBe(source._userGroups);
        expect([...state.hiddenPluginGroupIds]).toEqual(['plugin.current']);
        expect(state.filterPatterns).toEqual(['current/**']);

        handlers.recomputeGroups();
        state.userGroups = [{ id: 'group.loaded' } as never];
        state.hiddenPluginGroupIds = new Set<string>(['plugin.loaded']);
        state.filterPatterns = ['loaded/**'];
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._loadGroupsAndFilterPatterns();

    expect(dependencies.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(dependencies.loadGroupState).toHaveBeenCalledWith(configuration, source._context.workspaceState);
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._userGroups).toEqual([{ id: 'group.loaded' }]);
    expect([...source._hiddenPluginGroupIds]).toEqual(['plugin.loaded']);
    expect(source._filterPatterns).toEqual(['loaded/**']);
  });

  it('recomputes loaded groups from the freshly synced provider state', () => {
    const source = createSource({
      _userGroups: [{ id: 'group.current' } as never],
      _hiddenPluginGroupIds: new Set<string>(['plugin.current']),
      _filterPatterns: ['current/**'],
    });
    const loadedGroups = [{ id: 'group.loaded' } as never];
    const loadedHiddenPluginGroupIds = new Set<string>(['plugin.loaded']);
    const loadedFilterPatterns = ['loaded/**'];
    const computeMergedGroups = vi.fn(() => {
      expect(source._userGroups).toEqual(loadedGroups);
      expect([...source._hiddenPluginGroupIds]).toEqual(['plugin.loaded']);
      expect(source._filterPatterns).toEqual(loadedFilterPatterns);
    });
    source._computeMergedGroups = computeMergedGroups;

    const { dependencies } = createDependencies({
      applyLoadedGroupState: vi.fn((_loadedGroupState, state, handlers) => {
        state.userGroups = loadedGroups;
        state.hiddenPluginGroupIds = loadedHiddenPluginGroupIds;
        state.filterPatterns = loadedFilterPatterns;
        handlers.recomputeGroups();
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._loadGroupsAndFilterPatterns();

    expect(computeMergedGroups).toHaveBeenCalledOnce();
  });

  it('migrates legacy groups into configuration and clears the persisted workspace value', () => {
    const get = vi.fn((key: string) => {
      if (key === 'codegraphy.groups') return undefined;
      return undefined;
    }) as WorkspaceStateGetMock;
    const workspaceState = {
      get,
      update: vi.fn(() => Promise.resolve()),
    };
    const source = createSource({
      _context: { workspaceState },
    });
    const legacyGroups = [{ id: 'group.legacy' } as never];
    const workspaceFolders = [{ name: 'workspace-folder', uri: { fsPath: '/workspace' }, index: 0 }] as never;
    const { configuration, dependencies } = createDependencies({
      getWorkspaceFolders: vi.fn(() => workspaceFolders),
      getConfigTarget: vi.fn(() => 'workspace-folder'),
      applyLoadedGroupState: vi.fn((_groupState, _state, handlers) => {
        handlers.persistLegacyGroups(legacyGroups);
        handlers.clearLegacyGroups();
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._loadGroupsAndFilterPatterns();

    expect(dependencies.getWorkspaceFolders).toHaveBeenCalledOnce();
    expect(dependencies.getConfigTarget).toHaveBeenCalledWith(workspaceFolders);
    expect(configuration.update).toHaveBeenCalledWith('groups', legacyGroups, 'workspace-folder');
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.groups', undefined);
  });

  it('loads disabled rules and plugins from inspected config and persisted workspace keys', () => {
    const get = vi.fn((key: string) =>
      key === 'codegraphy.disabledRules' ? ['rule.saved'] : ['plugin.saved']
    ) as WorkspaceStateGetMock;
    const workspaceState = {
      get,
      update: vi.fn(() => Promise.resolve()),
    };
    const source = createSource({
      _context: { workspaceState },
    });
    const initialDisabledRules = source._disabledRules;
    const initialDisabledPlugins = source._disabledPlugins;
    const disabledRulesInspect = { workspaceValue: ['rule.config'] };
    const disabledPluginsInspect = { workspaceValue: ['plugin.config'] };
    const { configuration, dependencies } = createDependencies({
      loadDisabledState: vi.fn(() => ({
        disabledRules: new Set<string>(['rule.saved']),
        disabledPlugins: new Set<string>(['plugin.saved']),
        changed: true,
      })),
    });

    configuration.inspect.mockImplementation((key: string) =>
      key === 'disabledRules' ? disabledRulesInspect : disabledPluginsInspect,
    );

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    expect(methods._loadDisabledRulesAndPlugins()).toBe(true);

    expect(dependencies.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(configuration.inspect).toHaveBeenNthCalledWith(1, 'disabledRules');
    expect(configuration.inspect).toHaveBeenNthCalledWith(2, 'disabledPlugins');
    expect(workspaceState.get).toHaveBeenNthCalledWith(1, 'codegraphy.disabledRules');
    expect(workspaceState.get).toHaveBeenNthCalledWith(2, 'codegraphy.disabledPlugins');
    expect(dependencies.loadDisabledState).toHaveBeenCalledWith(initialDisabledRules, initialDisabledPlugins, {
      disabledRulesInspect,
      disabledPluginsInspect,
      persistedDisabledRules: ['rule.saved'],
      persistedDisabledPlugins: ['plugin.saved'],
    });
    expect([...source._disabledRules]).toEqual(['rule.saved']);
    expect([...source._disabledPlugins]).toEqual(['plugin.saved']);
  });

  it('sends settings through the codegraphy configuration and provider message bridge', () => {
    const source = createSource();
    const message = {
      type: 'SETTINGS_UPDATED',
      payload: { backgroundColor: '#112233' },
    } as never;
    const { configuration, dependencies } = createDependencies({
      sendProviderSettings: vi.fn((_viewContext, options) => {
        expect(options.getConfiguration()).toBe(configuration);
        options.sendMessage(message);
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._sendSettings();

    expect(dependencies.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(dependencies.sendProviderSettings).toHaveBeenCalledWith(source._viewContext, expect.any(Object));
    expect(source._sendMessage).toHaveBeenCalledWith(message);
  });

  it('sends all settings with the current state, analyzer filters, and side-effect callbacks', () => {
    const source = createSource({
      _analyzer: { getPluginFilterPatterns: vi.fn(() => ['plugin/**']) },
    });
    const snapshot = { snapshot: true } as never;
    const message = {
      type: 'SETTINGS_UPDATED',
      payload: { backgroundColor: '#112233' },
    } as never;
    const { configuration, dependencies } = createDependencies({
      captureSettingsSnapshot: vi.fn(() => snapshot),
      sendProviderAllSettings: vi.fn((state, options) => {
        expect(state.viewContext).toBe(source._viewContext);
        expect([...state.hiddenPluginGroupIds]).toEqual(['plugin.current']);
        expect(state.userGroups).toEqual([{ id: 'group.current' }]);
        expect(state.filterPatterns).toEqual(['current/**']);
        expect(options.captureSettingsSnapshot()).toBe(snapshot);
        expect(options.getPluginFilterPatterns()).toEqual(['plugin/**']);

        options.sendMessage(message);
        options.recomputeGroups();
        options.sendGroupsUpdated();
        state.hiddenPluginGroupIds = new Set<string>(['plugin.updated']);
        state.userGroups = [{ id: 'group.updated' } as never];
        state.filterPatterns = ['updated/**'];
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._sendAllSettings();

    expect(dependencies.sendProviderAllSettings).toHaveBeenCalledOnce();
    expect(dependencies.captureSettingsSnapshot).toHaveBeenCalledWith(
      configuration,
      { damping: 1 },
      'connections',
    );
    expect(source._getPhysicsSettings).toHaveBeenCalledOnce();
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith(message);
    expect([...source._hiddenPluginGroupIds]).toEqual(['plugin.updated']);
    expect(source._userGroups).toEqual([{ id: 'group.updated' }]);
    expect(source._filterPatterns).toEqual(['updated/**']);
  });

  it('recomputes snapshot groups from the updated provider state before sending them', () => {
    const source = createSource({
      _userGroups: [{ id: 'group.current' } as never],
      _hiddenPluginGroupIds: new Set<string>(['plugin.current']),
      _filterPatterns: ['current/**'],
      _analyzer: { getPluginFilterPatterns: vi.fn(() => ['plugin/**']) },
    });
    const snapshotGroups = [{ id: 'group.snapshot' } as never];
    const snapshotHiddenPluginGroups = ['plugin.snapshot'];
    const snapshotFilterPatterns = ['snapshot/**'];
    const snapshot = {
      groups: snapshotGroups,
      hiddenPluginGroups: snapshotHiddenPluginGroups,
      filterPatterns: snapshotFilterPatterns,
    } as never;
    const computeMergedGroups = vi.fn(() => {
      expect(source._userGroups).toEqual(snapshotGroups);
      expect([...source._hiddenPluginGroupIds]).toEqual(snapshotHiddenPluginGroups);
      expect(source._filterPatterns).toEqual(snapshotFilterPatterns);
    });
    source._computeMergedGroups = computeMergedGroups;

    const { dependencies } = createDependencies({
      captureSettingsSnapshot: vi.fn(() => snapshot),
      sendProviderAllSettings: vi.fn((state, options) => {
        state.hiddenPluginGroupIds = new Set(snapshotHiddenPluginGroups);
        state.userGroups = snapshotGroups;
        state.filterPatterns = snapshotFilterPatterns;
        options.recomputeGroups();
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._sendAllSettings();

    expect(computeMergedGroups).toHaveBeenCalledOnce();
  });

  it('defaults missing snapshot groups and filters before recomputing', () => {
    const source = createSource({
      _userGroups: [{ id: 'group.current' } as never],
      _hiddenPluginGroupIds: new Set<string>(['plugin.current']),
      _filterPatterns: ['current/**'],
    });
    const computeMergedGroups = vi.fn(() => {
      expect(source._userGroups).toEqual([]);
      expect([...source._hiddenPluginGroupIds]).toEqual([]);
      expect(source._filterPatterns).toEqual([]);
    });
    source._computeMergedGroups = computeMergedGroups;

    const { dependencies } = createDependencies({
      captureSettingsSnapshot: vi.fn(
        () =>
          ({
            hiddenPluginGroups: undefined,
            groups: undefined,
            filterPatterns: undefined,
          }) as never,
      ),
      sendProviderAllSettings: sendGraphViewProviderAllSettings,
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._sendAllSettings();

    expect(computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._userGroups).toEqual([]);
    expect([...source._hiddenPluginGroupIds]).toEqual([]);
    expect(source._filterPatterns).toEqual([]);
  });

  it('falls back to an empty plugin filter list when no analyzer is attached', () => {
    const source = createSource({
      _analyzer: undefined,
    });
    const { dependencies } = createDependencies({
      sendProviderAllSettings: vi.fn((_state, options) => {
        expect(options.getPluginFilterPatterns()).toEqual([]);
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._sendAllSettings();

    expect(dependencies.sendProviderAllSettings).toHaveBeenCalledOnce();
  });
});
