import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IPhysicsSettings } from '../../../../src/shared/settings/physics';

const mocks = vi.hoisted(() => {
  let workspaceFolders: { name: string }[] | undefined = undefined;
  const configuration = {
    get: vi.fn((_: string, fallback: unknown) => fallback),
    inspect: vi.fn((_: string) => undefined),
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
      filterPatterns: [],
    })),
    applyLoadedGroupState: vi.fn(),
    loadDisabledState: vi.fn(() => ({
      disabledSources: new Set<string>(),
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

vi.mock('../../../../src/extension/graphView/settings/reader', () => ({
  getGraphViewConfigTarget: mocks.getConfigTarget,
}));

vi.mock('../../../../src/extension/graphView/groups/state', () => ({
  loadGraphViewGroupState: mocks.loadGroupState,
}));

vi.mock('../../../../src/extension/graphView/groups/sync', () => ({
  applyLoadedGraphViewGroupState: mocks.applyLoadedGroupState,
}));

vi.mock('../../../../src/extension/graphView/settings/disabled', () => ({
  loadGraphViewDisabledState: mocks.loadDisabledState,
}));

vi.mock('../../../../src/extension/graphView/settings/snapshot', () => ({
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

type WorkspaceStateGetMock = ReturnType<typeof vi.fn> & (<T>(key: string) => T | undefined);

function createSource(
  overrides: Partial<GraphViewProviderSettingsStateMethodsSource> = {},
): GraphViewProviderSettingsStateMethodsSource {
  const workspaceState = {
    get: vi.fn(() => undefined) as WorkspaceStateGetMock,
  };

  const source: GraphViewProviderSettingsStateMethodsSource = {
    _context: { workspaceState },
    _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 } as never,
    _userGroups: [{ id: 'group.current' } as never],
    _filterPatterns: ['current/**'],
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _disabledSources: new Set<string>(['rule.current']),
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

  source._graphData ??= { nodes: [], edges: [] } satisfies IGraphData;

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
      filterPatterns: [],
    });
    mocks.loadDisabledState.mockReturnValue({
      disabledSources: new Set<string>(),
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
    const source = createSource();
    mocks.applyLoadedGroupState.mockImplementation((_groupState, state, handlers) => {
      handlers.recomputeGroups();
      state.userGroups = [{ id: 'group.updated' } as never];
      state.filterPatterns = ['updated/**'];
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    methods._loadGroupsAndFilterPatterns();

    expect(mocks.getConfiguration).toHaveBeenCalledOnce();
    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.getConfigTarget).not.toHaveBeenCalled();
    expect(mocks.otherConfiguration.update).not.toHaveBeenCalled();
    expect(mocks.configuration.update).not.toHaveBeenCalled();
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._userGroups).toEqual([{ id: 'group.updated' }]);
    expect(source._filterPatterns).toEqual(['updated/**']);
  });

  it('loads disabled state through the default configuration inspection', () => {
    const source = createSource();
    const disabledSourcesInspect = { workspaceValue: ['rule.config'] };
    const disabledPluginsInspect = { workspaceValue: ['plugin.config'] };
    mocks.configuration.inspect.mockImplementation(((
      key: string,
    ) => (key === 'disabledSources' ? disabledSourcesInspect : disabledPluginsInspect)) as never);
    mocks.loadDisabledState.mockReturnValue({
      disabledSources: new Set<string>(['rule.config']),
      disabledPlugins: new Set<string>(['plugin.config']),
      changed: true,
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    expect(methods._loadDisabledRulesAndPlugins()).toBe(true);

    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.configuration.inspect).toHaveBeenNthCalledWith(1, 'disabledSources');
    expect(mocks.configuration.inspect).toHaveBeenNthCalledWith(2, 'disabledPlugins');
    expect(mocks.loadDisabledState).toHaveBeenCalledWith(
      new Set<string>(['rule.current']),
      new Set<string>(['plugin.current']),
      {
        disabledSourcesInspect,
        disabledPluginsInspect,
      },
    );
    expect([...source._disabledSources]).toEqual(['rule.config']);
    expect([...source._disabledPlugins]).toEqual(['plugin.config']);
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
      expect(handlers.getConfiguration()).toEqual(
        expect.objectContaining({
          get: expect.any(Function),
          inspect: expect.any(Function),
          update: expect.any(Function),
        }),
      );
      handlers.sendMessage(settingsMessage);
    });
    mocks.sendProviderAllSettings.mockImplementation((state, handlers) => {
      expect(state.viewContext).toBe(source._viewContext);
      expect(state.userGroups).toEqual([{ id: 'group.current' }]);
      expect(state.filterPatterns).toEqual(['current/**']);
      expect(handlers.captureSettingsSnapshot()).toEqual({ snapshot: true });
      expect(handlers.getPluginFilterPatterns()).toEqual(['plugin/**']);
      handlers.sendMessage(allSettingsMessage);
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      state.userGroups = [{ id: 'group.updated' } as never];
      state.filterPatterns = ['updated/**'];
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    methods._sendSettings();

    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.sendProviderSettings).toHaveBeenCalledOnce();
    expect(mocks.sendProviderAllSettings).not.toHaveBeenCalled();
    expect(source._sendMessage).toHaveBeenCalledTimes(2);
    expect(source._sendMessage).toHaveBeenNthCalledWith(1, settingsMessage);
    expect(source._sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'GRAPH_CONTROLS_UPDATED' }),
    );
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
      expect(state.userGroups).toEqual([{ id: 'group.current' }]);
      expect(state.filterPatterns).toEqual(['current/**']);
      expect(handlers.captureSettingsSnapshot()).toEqual({ snapshot: true });
      expect(handlers.getPluginFilterPatterns()).toEqual(['plugin/**']);
      handlers.sendMessage(allSettingsMessage);
      handlers.recomputeGroups();
      handlers.sendGroupsUpdated();
      state.userGroups = [{ id: 'group.updated' } as never];
      state.filterPatterns = ['updated/**'];
    });

    const methods = createGraphViewProviderSettingsStateMethods(source);

    methods._sendAllSettings();

    expect(mocks.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(mocks.sendProviderSettings).not.toHaveBeenCalled();
    expect(mocks.sendProviderAllSettings).toHaveBeenCalledOnce();
    expect(mocks.captureSettingsSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        get: expect.any(Function),
        inspect: expect.any(Function),
        update: expect.any(Function),
      }),
      { damping: 1 },
      'connections',
    );
    expect(source._sendMessage).toHaveBeenCalledTimes(2);
    expect(source._sendMessage).toHaveBeenNthCalledWith(1, allSettingsMessage);
    expect(source._sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: 'GRAPH_CONTROLS_UPDATED' }),
    );
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._sendGroupsUpdated).toHaveBeenCalledOnce();
    expect(source._userGroups).toEqual([{ id: 'group.updated' }]);
    expect(source._filterPatterns).toEqual(['updated/**']);
  });
});
