import { describe, expect, it, vi } from 'vitest';
import type { DirectionMode, IGraphData } from '../../../../../src/shared/contracts';
import {
  applySettingsDirectionMessage,
} from '../../../../../src/extension/graphView/messages/settings/direction';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/messages/settings';

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

describe('graph view settings direction message', () => {
  it('updates direction mode and publishes the full direction payload', async () => {
    const state = createState();
    const handlers = createHandlers({
      particleSpeed: 0.1,
      particleSize: 8,
      directionColor: 'bad-color',
    });

    await applySettingsDirectionMessage(
      { type: 'UPDATE_DIRECTION_MODE', payload: { directionMode: 'particles' } },
      state,
      handlers,
    );

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

    await applySettingsDirectionMessage(
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

    await applySettingsDirectionMessage(
      { type: 'UPDATE_FOLDER_NODE_COLOR', payload: { folderNodeColor: '#123abc' } },
      state,
      handlers,
    );

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

    await applySettingsDirectionMessage(
      { type: 'UPDATE_FOLDER_NODE_COLOR', payload: { folderNodeColor: '#123abc' } },
      state,
      handlers,
    );

    expect(handlers.applyViewTransform).not.toHaveBeenCalled();
    expect(handlers.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsDirectionMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: 42 } }, state, handlers),
    ).resolves.toBe(false);
  });
});
