import { describe, expect, it, vi } from 'vitest';
import { applyFilterPatternsUpdate } from '../../../../../../src/extension/graphView/webview/settingsMessages/updates/filterPatterns';
import { createHandlers, createState } from '../testSupport';

describe('settingsMessages/updates/filterPatterns', () => {
  it('stores filter patterns and publishes plugin patterns', async () => {
    const state = createState();
    const handlers = createHandlers({
      getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    });

    await applyFilterPatternsUpdate(
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
});
