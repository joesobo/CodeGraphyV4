import { describe, expect, it, vi } from 'vitest';
import { sendFilterPatternsUpdated } from '../../../../../../../src/extension/graphView/webview/settingsMessages/updates/apply/filterPatternNotification';
import { createHandlers, createState } from '../../testSupport';

describe('settingsMessages/updates/apply/filterPatternNotification', () => {
  it('sends filter pattern state using config fallbacks', () => {
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'disabledCustomFilterPatterns') {
          return ['dist/**'] as T;
        }
        if (key === 'disabledPluginFilterPatterns') {
          return ['venv/**'] as T;
        }
        return defaultValue;
      }),
      getPluginFilterGroups: vi.fn(() => [{
        id: 'python',
        label: 'Python',
        patterns: ['venv/**'],
        pluginId: 'codegraphy.vue',
        pluginName: 'Python',
      }]),
      getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    });

    sendFilterPatternsUpdated(createState({ filterPatterns: ['dist/**'] }), handlers);

    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['venv/**'],
        pluginPatternGroups: [{
          id: 'python',
          label: 'Python',
          patterns: ['venv/**'],
          pluginId: 'codegraphy.vue',
          pluginName: 'Python',
        }],
        disabledCustomPatterns: ['dist/**'],
        disabledPluginPatterns: ['venv/**'],
      },
    });
  });

  it('uses disabled pattern overrides instead of reading config', () => {
    const handlers = createHandlers();

    sendFilterPatternsUpdated(createState(), handlers, {
      disabledCustomPatterns: ['custom/**'],
      disabledPluginPatterns: ['plugin/**'],
    });

    expect(handlers.getConfig).not.toHaveBeenCalled();
    expect(handlers.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        disabledCustomPatterns: ['custom/**'],
        disabledPluginPatterns: ['plugin/**'],
      }),
    }));
  });

  it('uses empty disabled pattern defaults when config has no values', () => {
    const handlers = createHandlers();

    sendFilterPatternsUpdated(createState(), handlers);

    expect(handlers.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({
        disabledCustomPatterns: [],
        disabledPluginPatterns: [],
      }),
    }));
  });
});
