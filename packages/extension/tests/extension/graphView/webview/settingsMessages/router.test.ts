import { describe, expect, it, vi } from 'vitest';
import {
  applySettingsMessage,
  type GraphViewSettingsMessageHandlers,
  type GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
    filterPatterns: [],
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
    recomputeGroups: vi.fn(),
    sendGroupsUpdated: vi.fn(),
    smartRebuild: vi.fn(),
    getPluginFilterPatterns: vi.fn(() => []),
    getPluginFilterGroups: vi.fn(() => []),
    sendGraphControls: vi.fn(),
    analyzeAndSendData: vi.fn(() => Promise.resolve()),
    reloadWorkspacePlugins: vi.fn(() => Promise.resolve()),
    reprocessPluginFiles: vi.fn(() => Promise.resolve()),
    sendMessage: vi.fn(),
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
        payload: {
          patterns: ['dist/**'],
          pluginPatterns: ['venv/**'],
          pluginPatternGroups: [],
          disabledCustomPatterns: [],
          disabledPluginPatterns: [],
        },
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
});
