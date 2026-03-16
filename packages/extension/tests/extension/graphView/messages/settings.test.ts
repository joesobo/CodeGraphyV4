import { describe, expect, it, vi } from 'vitest';
import type { DirectionMode, IGraphData } from '../../../../src/shared/types';
import {
  applySettingsMessage,
  type GraphViewSettingsMessageHandlers,
  type GraphViewSettingsMessageState,
} from '../../../../src/extension/graphView/messages/settings';

function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
    activeViewId: 'codegraphy.graphView',
    disabledPlugins: new Set<string>(),
    disabledRules: new Set<string>(),
    filterPatterns: [],
    graphData: { nodes: [], edges: [] } satisfies IGraphData,
    viewContext: { folderNodeColor: '#111111' },
    ...overrides,
  };
}

function createHandlers(
  initialConfig: Record<string, unknown> = {},
  overrides: Partial<GraphViewSettingsMessageHandlers> = {},
): GraphViewSettingsMessageHandlers {
  const config = new Map<string, unknown>([
    ['directionMode', 'arrows'],
    ['particleSpeed', 0.005],
    ['particleSize', 4],
    ['directionColor', '#475569'],
    ...Object.entries(initialConfig),
  ]);

  return {
    getConfig: vi.fn(<T>(key: string, defaultValue: T): T =>
      config.has(key) ? (config.get(key) as T) : defaultValue,
    ),
    updateConfig: vi.fn((key: string, value: unknown) => {
      config.set(key, value);
      return Promise.resolve();
    }),
    getPluginFilterPatterns: vi.fn(() => []),
    sendMessage: vi.fn(),
    applyViewTransform: vi.fn(),
    smartRebuild: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view settings message', () => {
  it('delegates reset-all requests', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(applySettingsMessage({ type: 'RESET_ALL_SETTINGS' }, state, handlers)).resolves.toBe(
      true,
    );

    expect(handlers.resetAllSettings).toHaveBeenCalledOnce();
  });

  it('updates filter patterns and publishes plugin patterns', async () => {
    const state = createState();
    const handlers = createHandlers({}, { getPluginFilterPatterns: vi.fn(() => ['venv/**']) });

    await applySettingsMessage(
      { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
      state,
      handlers,
    );

    expect(state.filterPatterns).toEqual(['dist/**']);
    expect(handlers.updateConfig).toHaveBeenCalledWith('filterPatterns', ['dist/**']);
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: { patterns: ['dist/**'], pluginPatterns: ['venv/**'] },
    });
  });

  it.each([
    ['UPDATE_SHOW_ORPHANS', { showOrphans: false }, 'showOrphans', false],
    ['UPDATE_BIDIRECTIONAL_MODE', { bidirectionalMode: 'combined' }, 'bidirectionalEdges', 'combined'],
    ['UPDATE_PARTICLE_SETTING', { key: 'particleSpeed', value: 0.2 }, 'particleSpeed', 0.2],
    ['UPDATE_MAX_FILES', { maxFiles: 250 }, 'maxFiles', 250],
  ] as const)('persists %s through config updates', async (type, payload, key, value) => {
    const state = createState();
    const handlers = createHandlers();

    await expect(applySettingsMessage({ type, payload }, state, handlers)).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith(key, value);
  });

  it('updates direction mode and publishes the full direction payload', async () => {
    const state = createState();
    const handlers = createHandlers({
      particleSpeed: 0.1,
      particleSize: 8,
      directionColor: 'bad-color',
    });

    await expect(
      applySettingsMessage(
        { type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: 'particles' } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('directionMode', 'particles');
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: {
        directionMode: 'particles',
        particleSpeed: 0.1,
        particleSize: 8,
        directionColor: '#475569',
      },
    });
  });

  it('normalizes direction color updates before persisting them', async () => {
    const state = createState();
    const handlers = createHandlers({
      directionMode: 'none' satisfies DirectionMode,
      particleSpeed: 0.2,
      particleSize: 6,
    });

    await applySettingsMessage(
      { type: 'UPDATE_DIRECTION_COLOR', payload: { directionColor: '  #aa00cc ' } },
      state,
      handlers,
    );

    expect(handlers.updateConfig).toHaveBeenCalledWith('directionColor', '#AA00CC');
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'DIRECTION_SETTINGS_UPDATED',
      payload: {
        directionMode: 'none',
        particleSpeed: 0.2,
        particleSize: 6,
        directionColor: '#AA00CC',
      },
    });
  });

  it('updates folder node color and refreshes folder graph data in folder view', async () => {
    const graphData: IGraphData = {
      nodes: [{ id: 'src', label: 'src', type: 'folder', val: 1 }],
      edges: [],
    };
    const state = createState({
      activeViewId: 'codegraphy.folder',
      graphData,
    });
    const handlers = createHandlers();

    await expect(
      applySettingsMessage(
        { type: 'UPDATE_FOLDER_NODE_COLOR', payload: { folderNodeColor: '#123abc' } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(state.viewContext.folderNodeColor).toBe('#123ABC');
    expect(handlers.updateConfig).toHaveBeenCalledWith('folderNodeColor', '#123ABC');
    expect(handlers.sendMessage).toHaveBeenNthCalledWith(1, {
      type: 'FOLDER_NODE_COLOR_UPDATED',
      payload: { folderNodeColor: '#123ABC' },
    });
    expect(handlers.applyViewTransform).toHaveBeenCalledOnce();
    expect(handlers.sendMessage).toHaveBeenNthCalledWith(2, {
      type: 'GRAPH_DATA_UPDATED',
      payload: graphData,
    });
  });

  it('updates folder node color without re-sending graph data outside folder view', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsMessage(
        { type: 'UPDATE_FOLDER_NODE_COLOR', payload: { folderNodeColor: '#123abc' } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.applyViewTransform).not.toHaveBeenCalled();
    expect(handlers.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('updates label visibility and publishes it immediately', async () => {
    const state = createState();
    const handlers = createHandlers();

    await applySettingsMessage(
      { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
      state,
      handlers,
    );

    expect(handlers.updateConfig).toHaveBeenCalledWith('showLabels', false);
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'SHOW_LABELS_UPDATED',
      payload: { showLabels: false },
    });
  });

  it('disables rules and triggers a targeted rebuild', async () => {
    const state = createState();
    const handlers = createHandlers();

    await applySettingsMessage(
      {
        type: 'TOGGLE_RULE',
        payload: { qualifiedId: 'codegraphy.typescript:dynamic-import', enabled: false },
      },
      state,
      handlers,
    );

    expect(state.disabledRules.has('codegraphy.typescript:dynamic-import')).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledRules', [
      'codegraphy.typescript:dynamic-import',
    ]);
    expect(handlers.smartRebuild).toHaveBeenCalledWith(
      'rule',
      'codegraphy.typescript:dynamic-import',
    );
  });

  it('re-enables plugins and triggers a targeted rebuild', async () => {
    const state = createState({
      disabledPlugins: new Set(['codegraphy.python']),
    });
    const handlers = createHandlers();

    await applySettingsMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.python', enabled: true },
      },
      state,
      handlers,
    );

    expect(state.disabledPlugins.has('codegraphy.python')).toBe(false);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledPlugins', []);
    expect(handlers.smartRebuild).toHaveBeenCalledWith('plugin', 'codegraphy.python');
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(applySettingsMessage({ type: 'GET_PHYSICS_SETTINGS' }, state, handlers)).resolves.toBe(
      false,
    );
  });
});
