import { describe, expect, it, vi } from 'vitest';
import {
  applySettingsUpdateMessage,
} from '../../../../../src/extension/graphView/webview/settingsMessages/updates/apply';
import { createHandlers, createState } from './testSupport';

describe('graph view settings update message', () => {
  it('delegates reset-all requests', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsUpdateMessage({ type: 'RESET_ALL_SETTINGS' }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.resetAllSettings).toHaveBeenCalledOnce();
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
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('persists filter row state and refreshes graph data so old nodes can return', async () => {
    const state = createState({ filterPatterns: ['dist/**'] });
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'disabledCustomFilterPatterns') {
          return ['dist/**'] as T;
        }
        return defaultValue;
      }),
    });

    await applySettingsUpdateMessage(
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'custom', pattern: 'dist/**', enabled: true },
      },
      state,
      handlers,
    );

    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledCustomFilterPatterns', []);
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('persists section filter state and refreshes graph data once', async () => {
    const state = createState({ filterPatterns: ['dist/**', 'coverage/**'] });
    const handlers = createHandlers();

    await applySettingsUpdateMessage(
      {
        type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
        payload: { source: 'custom', enabled: false },
      },
      state,
      handlers,
    );

    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledCustomFilterPatterns', [
      'dist/**',
      'coverage/**',
    ]);
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
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

  it('persists update-max-files through config updates', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsUpdateMessage({ type: 'UPDATE_MAX_FILES', payload: { maxFiles: 250 } }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('maxFiles', 250);
  });

  it('persists workspace plugin package order through the plugins array', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { package: '@codegraphy/plugin-markdown' },
            { package: '@codegraphy/plugin-python' },
          ] as T;
        }
        return defaultValue;
      }),
    });

    await expect(
      applySettingsUpdateMessage(
        {
          type: 'UPDATE_PLUGIN_PACKAGE_ORDER',
          payload: {
            packageNames: ['@codegraphy/plugin-python', '@codegraphy/plugin-markdown'],
          },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { package: '@codegraphy/plugin-python' },
      { package: '@codegraphy/plugin-markdown' },
    ]);
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
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
