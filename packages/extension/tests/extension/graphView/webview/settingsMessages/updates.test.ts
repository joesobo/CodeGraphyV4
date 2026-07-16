import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebviewToExtensionMessage } from '../../../../../src/shared/protocol/webviewToExtension';
import {
  applySettingsUpdateMessage,
} from '../../../../../src/extension/graphView/webview/settingsMessages/updates/apply';
import { createPluginGraphWorkScheduler } from '../../../../../src/extension/graphView/webview/settingsMessages/pluginGraphWork';
import { createHandlers, createState } from './testSupport';

describe('graph view settings update message', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('delegates reset-all requests', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsUpdateMessage({ type: 'RESET_ALL_SETTINGS' }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.resetAllSettings).toHaveBeenCalledOnce();
  });

  it('persists minimap visibility without scheduling analysis or rebuild work', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(applySettingsUpdateMessage(
      { type: 'UPDATE_SHOW_MINIMAP', payload: { showMinimap: false } },
      state,
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('showMinimap', false);
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('updates filter patterns and publishes plugin patterns', async () => {
    const state = createState();
    const handlers = createHandlers({
      getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    });

    await applySettingsUpdateMessage(
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
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('persists filter row state without scheduling graph work', async () => {
    const state = createState({ filterPatterns: ['dist/**'] });
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'disabledCustomFilterPatterns') {
          return ['dist/**'] as T;
        }
        return defaultValue;
      }),
    });

    await expect(applySettingsUpdateMessage(
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'custom', pattern: 'dist/**', enabled: true },
      },
      state,
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledCustomFilterPatterns', []);
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('persists section filter state without scheduling graph work', async () => {
    const state = createState({ filterPatterns: ['dist/**', 'coverage/**'] });
    const handlers = createHandlers();

    await expect(applySettingsUpdateMessage(
      {
        type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
        payload: { source: 'custom', enabled: false },
      },
      state,
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledCustomFilterPatterns', [
      'dist/**',
      'coverage/**',
    ]);
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('keeps filter bursts projection-only with zero graph jobs', async () => {
    const state = createState({ filterPatterns: ['dist/**', 'coverage/**'] });
    const handlers = createHandlers({
      getPluginFilterPatterns: vi.fn(() => ['venv/**', '.mypy_cache/**']),
    });

    const messages: WebviewToExtensionMessage[] = [
      { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**'] } },
      { type: 'UPDATE_FILTER_PATTERNS', payload: { patterns: ['dist/**', 'coverage/**'] } },
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'custom', pattern: 'dist/**', enabled: false },
      },
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'custom', pattern: 'dist/**', enabled: true },
      },
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'plugin', pattern: 'venv/**', enabled: false },
      },
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'plugin', pattern: 'venv/**', enabled: true },
      },
      {
        type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
        payload: { source: 'custom', enabled: false },
      },
      {
        type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
        payload: { source: 'custom', enabled: true },
      },
      {
        type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
        payload: { source: 'plugin', enabled: false },
      },
      {
        type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
        payload: { source: 'plugin', enabled: true },
      },
    ];

    for (const message of messages) {
      await expect(applySettingsUpdateMessage(message, state, handlers)).resolves.toBe(true);
    }

    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
    expect(handlers.reprocessGraphScope).not.toHaveBeenCalled();
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('persists update-show-orphans through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsUpdateMessage(
        { type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: false } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('showOrphans', false);
  });

  it('persists update-bidirectional-mode through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsUpdateMessage(
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
      applySettingsUpdateMessage(
        { type: 'UPDATE_PARTICLE_SETTING', payload: { key: 'particleSpeed', value: 0.2 } },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('particleSpeed', 0.2);
  });

  it('persists plugin-owned data and publishes it immediately', async () => {
    const state = createState();
    const handlers = createHandlers();
    const data = {
      enabled: true,
      preset: 'constellations',
      intensity: 0.6,
    };

    await expect(
      applySettingsUpdateMessage(
        {
          type: 'UPDATE_PLUGIN_DATA',
          payload: { pluginId: 'acme.plugin', data },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('pluginData', {
      'acme.plugin': data,
    });
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_DATA_UPDATED',
      payload: { pluginId: 'acme.plugin', data },
    });
  });

  it('uses plugin setting impact metadata instead of hard-coded plugin setting branches', async () => {
    const state = createState();
    const schedulePluginGraphWork = vi.fn();
    const handlers = createHandlers({
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'projection-only' as const,
        defaultSetting: 'settings-only' as const,
      })),
      schedulePluginGraphWork,
    });

    await expect(
      applySettingsUpdateMessage(
        {
          type: 'UPDATE_PLUGIN_DATA',
          payload: {
            pluginId: 'codegraphy.particles',
            data: { speed: 0.4, size: 0.8 },
          },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(schedulePluginGraphWork).not.toHaveBeenCalled();
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('coalesces analyzer plugin setting bursts into one graph work job', async () => {
    vi.useFakeTimers();
    const state = createState();
    const pluginData: Record<string, unknown> = {};
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const reprocessPluginFiles = vi.fn(() => Promise.resolve());
    const scheduler = createPluginGraphWorkScheduler({
      analyzeAndSendData,
      reprocessPluginFiles,
      smartRebuild: vi.fn(),
    }, { delayMs: 50 });
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'pluginData') {
          return { ...pluginData } as T;
        }
        return defaultValue;
      }),
      updateConfig: vi.fn(async (key: string, value: unknown) => {
        if (key === 'pluginData' && value && typeof value === 'object' && !Array.isArray(value)) {
          Object.assign(pluginData, value as Record<string, unknown>);
        }
      }),
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'reanalyze-plugin-files' as const,
        defaultSetting: 'reanalyze-plugin-files' as const,
      })),
      schedulePluginGraphWork: request => scheduler.schedule(request),
      analyzeAndSendData,
      reprocessPluginFiles,
    });

    for (let index = 0; index < 10; index += 1) {
      await expect(
        applySettingsUpdateMessage(
          {
            type: 'UPDATE_PLUGIN_DATA',
            payload: {
              pluginId: 'codegraphy.vue',
              data: { includeTests: index % 2 === 0 },
            },
          },
          state,
          handlers,
        ),
      ).resolves.toBe(true);
    }

    expect(analyzeAndSendData).not.toHaveBeenCalled();
    expect(reprocessPluginFiles).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);

    expect(reprocessPluginFiles).toHaveBeenCalledOnce();
    expect(reprocessPluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('merges plugin-owned data with existing plugin data', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'pluginData') {
          return {
            'other.plugin': { enabled: false },
          } as T;
        }
        return defaultValue;
      }),
    });
    const data = {
      enabled: true,
      preset: 'custom',
      intensity: 0.7,
      customModule: '.codegraphy/particles/ribbons.js',
    };

    await expect(
      applySettingsUpdateMessage(
        {
          type: 'UPDATE_PLUGIN_DATA',
          payload: { pluginId: 'acme.plugin', data },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('pluginData', {
      'other.plugin': { enabled: false },
      'acme.plugin': data,
    });
  });

  it('persists update-max-files through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsUpdateMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: 250 } }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('maxFiles', 250);
  });

  it('updates label visibility and publishes it immediately', async () => {
    const state = createState();
    const handlers = createHandlers();

    await applySettingsUpdateMessage(
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

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsUpdateMessage({ type: 'TOGGLE_PLUGIN', payload: { pluginId: 'x', enabled: false } }, state, handlers),
    ).resolves.toBe(false);
  });
});
