import fs from 'fs';
import os from 'os';
import path from 'path';
import * as vscode from 'vscode';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
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
    if (key === 'codegraphy.legend') return undefined;
    return undefined;
  }) as WorkspaceStateGetMock;
  const workspaceState = {
    get,
    update: vi.fn(() => Promise.resolve()),
  };

  const source: GraphViewProviderSettingsStateMethodsSource = {
    _context: { workspaceState },
    _viewContext: { activePlugins: new Set<string>(), depthLimit: 1 } as never,
    _userGroups: [{ id: 'group.current' } as never],
    _filterPatterns: ['current/**'],
    _graphData: { nodes: [], edges: [] } satisfies IGraphData,
    _rawGraphData: { nodes: [], edges: [] } satisfies IGraphData,
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
  source._rawGraphData ??= { nodes: [], edges: [] } satisfies IGraphData;
  source._disabledPlugins ??= new Set<string>();

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
        filterPatterns: [],
      }) as never),
      applyLoadedGroupState: vi.fn(),
      sendProviderSettings: vi.fn(),
      sendProviderAllSettings: vi.fn(),
      captureSettingsSnapshot: vi.fn(() => ({ snapshot: true }) as never),
      ...overrides,
    },
  };
}

describe('graphView/provider/settingsState', () => {
  const tempRoots: string[] = [];

  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('loads groups and filter patterns from persisted state and seeds the sync state', () => {
    const source = createSource();
    const groupState = {
      userGroups: [{ id: 'group.saved' } as never],
      filterPatterns: ['dist/**'],
    } as never;
    const { configuration, dependencies } = createDependencies({
      loadGroupState: vi.fn(() => groupState),
      applyLoadedGroupState: vi.fn((loadedGroupState, state, handlers) => {
        expect(loadedGroupState).toBe(groupState);
        expect(state.userGroups).toBe(source._userGroups);
        expect(state.filterPatterns).toEqual(['current/**']);

        handlers.recomputeGroups();
        state.userGroups = [{ id: 'group.loaded' } as never];
        state.filterPatterns = ['loaded/**'];
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._loadGroupsAndFilterPatterns();

    expect(dependencies.getConfiguration).toHaveBeenCalledWith('codegraphy');
    expect(dependencies.loadGroupState).toHaveBeenCalledWith(configuration);
    expect(source._computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._userGroups).toEqual([{ id: 'group.loaded' }]);
    expect(source._filterPatterns).toEqual(['loaded/**']);
  });

  it('recomputes loaded groups from the freshly synced provider state', () => {
    const source = createSource({
      _userGroups: [{ id: 'group.current' } as never],
      _filterPatterns: ['current/**'],
    });
    const loadedGroups = [{ id: 'group.loaded' } as never];
    const loadedFilterPatterns = ['loaded/**'];
    const computeMergedGroups = vi.fn(() => {
      expect(source._userGroups).toEqual(loadedGroups);
      expect(source._filterPatterns).toEqual(loadedFilterPatterns);
    });
    source._computeMergedGroups = computeMergedGroups;

    const { dependencies } = createDependencies({
      applyLoadedGroupState: vi.fn((_loadedGroupState, state, handlers) => {
        state.userGroups = loadedGroups;
        state.filterPatterns = loadedFilterPatterns;
        handlers.recomputeGroups();
      }),
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._loadGroupsAndFilterPatterns();

    expect(computeMergedGroups).toHaveBeenCalledOnce();
  });

  it('loads groups without attempting legacy workspace-state migration', () => {
    const workspaceState = {
      get: vi.fn(() => [{ id: 'group.legacy' }]),
      update: vi.fn(() => Promise.resolve()),
    };
    const source = createSource({
      _context: { workspaceState: workspaceState as never },
    });
    const { configuration, dependencies } = createDependencies();

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._loadGroupsAndFilterPatterns();

    expect(dependencies.getWorkspaceFolders).not.toHaveBeenCalled();
    expect(dependencies.getConfigTarget).not.toHaveBeenCalled();
    expect(configuration.update).not.toHaveBeenCalled();
    expect(workspaceState.get).not.toHaveBeenCalled();
    expect(workspaceState.update).not.toHaveBeenCalled();
  });

  it('clears legacy in-memory disabled plugin state without reading config', () => {
    const get = vi.fn((_key: string) => ['plugin.saved']) as WorkspaceStateGetMock;
    const workspaceState = {
      get,
      update: vi.fn(() => Promise.resolve()),
    };
    const source = createSource({
      _context: { workspaceState },
    });
    const { configuration, dependencies } = createDependencies();

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    expect(methods._loadDisabledRulesAndPlugins()).toBe(true);

    expect(dependencies.getConfiguration).not.toHaveBeenCalledWith('codegraphy');
    expect(configuration.get).not.toHaveBeenCalled();
    expect(configuration.inspect).not.toHaveBeenCalled();
    expect(workspaceState.get).not.toHaveBeenCalled();
    expect([...source._disabledPlugins]).toEqual([]);
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

  it('sends resolved css snippet stylesheets with settings updates', () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-settings-css-'));
    tempRoots.push(workspaceRoot);
    fs.mkdirSync(path.join(workspaceRoot, '.codegraphy', 'snippets'), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, '.codegraphy', 'snippets', 'graph.css'), 'body {}');
    const webview = {
      asWebviewUri: vi.fn((uri: vscode.Uri) => `webview:${uri.fsPath}`),
    };
    const source = createSource({
      _view: { webview } as never,
      _panels: [],
    });
    const { configuration, dependencies } = createDependencies({
      getWorkspaceFolders: vi.fn(() => [{ uri: vscode.Uri.file(workspaceRoot) }] as never),
    });
    configuration.get.mockImplementation((key, fallback) => (
      key === 'cssSnippets'
        ? {
          '.codegraphy/snippets/graph.css': true,
          '.codegraphy/snippets/disabled.css': false,
        }
        : fallback
    ));

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._sendSettings();

    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'CSS_SNIPPETS_UPDATED',
      payload: {
        snippets: {
          '.codegraphy/snippets/graph.css': true,
          '.codegraphy/snippets/disabled.css': false,
        },
        stylesheets: [
          'webview:' + path.join(workspaceRoot, '.codegraphy', 'snippets', 'graph.css'),
        ],
      },
    });
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
        expect(state.userGroups).toEqual([{ id: 'group.current' }]);
        expect(state.filterPatterns).toEqual(['current/**']);
        expect(options.captureSettingsSnapshot()).toBe(snapshot);
        expect(options.getPluginFilterPatterns()).toEqual(['plugin/**']);

        options.sendMessage(message);
        options.recomputeGroups();
        options.sendGroupsUpdated();
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
    expect(source._userGroups).toEqual([{ id: 'group.updated' }]);
    expect(source._filterPatterns).toEqual(['updated/**']);
  });

  it('recomputes snapshot groups from the updated provider state before sending them', () => {
    const source = createSource({
      _userGroups: [{ id: 'group.current' } as never],
      _filterPatterns: ['current/**'],
      _analyzer: { getPluginFilterPatterns: vi.fn(() => ['plugin/**']) },
    });
    const snapshotGroups = [{ id: 'group.snapshot' } as never];
    const snapshotFilterPatterns = ['snapshot/**'];
    const snapshot = {
      legends: snapshotGroups,
      filterPatterns: snapshotFilterPatterns,
    } as never;
    const computeMergedGroups = vi.fn(() => {
      expect(source._userGroups).toEqual(snapshotGroups);
      expect(source._filterPatterns).toEqual(snapshotFilterPatterns);
    });
    source._computeMergedGroups = computeMergedGroups;

    const { dependencies } = createDependencies({
      captureSettingsSnapshot: vi.fn(() => snapshot),
      sendProviderAllSettings: vi.fn((state, options) => {
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
      _filterPatterns: ['current/**'],
    });
    const computeMergedGroups = vi.fn(() => {
      expect(source._userGroups).toEqual([]);
      expect(source._filterPatterns).toEqual([]);
    });
    source._computeMergedGroups = computeMergedGroups;

    const { dependencies } = createDependencies({
      captureSettingsSnapshot: vi.fn(
        () =>
          ({
            legends: undefined,
            filterPatterns: undefined,
          }) as never,
      ),
      sendProviderAllSettings: sendGraphViewProviderAllSettings,
    });

    const methods = createGraphViewProviderSettingsStateMethods(source, dependencies);

    methods._sendAllSettings();

    expect(computeMergedGroups).toHaveBeenCalledOnce();
    expect(source._userGroups).toEqual([]);
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
