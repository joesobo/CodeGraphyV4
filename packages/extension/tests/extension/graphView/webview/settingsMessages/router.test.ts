import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '@/shared/graph/types';
import type { DirectionMode } from '@/shared/settings/modes';
import {
  applySettingsMessage,
  type GraphViewSettingsMessageHandlers,
  type GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
    disabledPlugins: new Set<string>(),
    disabledSources: new Set<string>(),
    filterPatterns: [],
    graphData: { nodes: [], edges: [] } satisfies IGraphData,
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

  const handlers = {
    getConfig: vi.fn(<T>(key: string, defaultValue: T): T =>
      config.has(key) ? (config.get(key) as T) : defaultValue,
    ),
    updateConfig: vi.fn((key: string, value: unknown) => {
      config.set(key, value);
      return Promise.resolve();
    }),
    getPluginFilterPatterns: vi.fn(() => []),
    sendGraphControls: vi.fn(),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn(),
    applyViewTransform: vi.fn(),
    smartRebuild: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  handlers.sendGraphControls ??= vi.fn();

  return handlers as GraphViewSettingsMessageHandlers;
}

describe('graph view settings router', () => {
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

  it('persists update-show-orphans through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsMessage({ type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: false } }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('showOrphans', false);
  });

  it('persists update-bidirectional-mode through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsMessage(
        { type: 'UPDATE_BIDIRECTIONAL_MODE', payload: { bidirectionalMode: 'combined' } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('bidirectionalEdges', 'combined');
  });

  it('persists update-particle-setting through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsMessage(
        { type: 'UPDATE_PARTICLE_SETTING', payload: { key: 'particleSpeed', value: 0.2 } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('particleSpeed', 0.2);
  });

  it('persists update-max-files through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: 250 } }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('maxFiles', 250);
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

  it('disables sources and triggers a targeted rebuild', async () => {
    const state = createState();
    const handlers = createHandlers();

    await applySettingsMessage(
      {
        type: 'TOGGLE_SOURCE',
        payload: { qualifiedSourceId: 'codegraphy.typescript:dynamic-import', enabled: false },
      },
      state,
      handlers,
    );

    expect(state.disabledSources.has('codegraphy.typescript:dynamic-import')).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledSources', [
      'codegraphy.typescript:dynamic-import',
    ]);
    expect(handlers.smartRebuild).toHaveBeenCalledWith(
      'rule',
      'codegraphy.typescript:dynamic-import',
    );
  });

  it('re-enables plugins and triggers a full re-analysis', async () => {
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
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(applySettingsMessage({ type: 'GET_PHYSICS_SETTINGS' }, state, handlers)).resolves.toBe(
      false,
    );
  });
});
