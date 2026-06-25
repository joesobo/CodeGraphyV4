import { describe, expect, it, vi } from 'vitest';
import {
  applyFilterPatternGroupMessage,
  applyFilterPatternStateMessage,
} from '../../../../../../../src/extension/graphView/webview/settingsMessages/updates/apply/filterPatternState';
import { createHandlers, createState } from '../../testSupport';

describe('settingsMessages/updates/apply/filterPatternState', () => {
  it('returns false for messages outside filter pattern state updates', async () => {
    await expect(applyFilterPatternStateMessage(
      { type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: true } },
      createState(),
      createHandlers(),
    )).resolves.toBe(false);
    await expect(applyFilterPatternGroupMessage(
      { type: 'UPDATE_SHOW_ORPHANS', payload: { showOrphans: true } },
      createState(),
      createHandlers(),
    )).resolves.toBe(false);
  });

  it('updates plugin row state and publishes the override', async () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'disabledPluginFilterPatterns') {
          return ['venv/**'] as T;
        }
        return defaultValue;
      }),
      getPluginFilterPatterns: vi.fn(() => ['venv/**', '.mypy_cache/**']),
    });

    await expect(applyFilterPatternStateMessage(
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'plugin', pattern: '.mypy_cache/**', enabled: false },
      },
      createState(),
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledPluginFilterPatterns', [
      'venv/**',
      '.mypy_cache/**',
    ]);
    expect(handlers.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        disabledPluginPatterns: ['venv/**', '.mypy_cache/**'],
      }),
    }));
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('updates plugin group state from all plugin patterns', async () => {
    const handlers = createHandlers({
      getPluginFilterPatterns: vi.fn(() => ['venv/**', '.mypy_cache/**']),
    });

    await expect(applyFilterPatternGroupMessage(
      {
        type: 'UPDATE_FILTER_PATTERN_GROUP_STATE',
        payload: { source: 'plugin', enabled: false },
      },
      createState(),
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledPluginFilterPatterns', [
      'venv/**',
      '.mypy_cache/**',
    ]);
    expect(handlers.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        disabledPluginPatterns: ['venv/**', '.mypy_cache/**'],
      }),
    }));
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('starts a disabled row list from an empty config default', async () => {
    const handlers = createHandlers();

    await expect(applyFilterPatternStateMessage(
      {
        type: 'UPDATE_FILTER_PATTERN_STATE',
        payload: { source: 'custom', pattern: 'dist/**', enabled: false },
      },
      createState(),
      handlers,
    )).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledCustomFilterPatterns', ['dist/**']);
  });
});
