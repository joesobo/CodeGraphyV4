import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/types';
import {
  applySettingsToggleMessage,
} from '../../../../src/extension/graphView/messages/settingsToggle';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
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
  overrides: Partial<GraphViewSettingsMessageHandlers> = {},
): GraphViewSettingsMessageHandlers {
  return {
    getConfig: vi.fn(<T>(_: string, defaultValue: T): T => defaultValue),
    updateConfig: vi.fn(() => Promise.resolve()),
    getPluginFilterPatterns: vi.fn(() => []),
    sendMessage: vi.fn(),
    applyViewTransform: vi.fn(),
    smartRebuild: vi.fn(),
    resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };
}

describe('graph view settings toggle message', () => {
  it('disables rules and triggers a targeted rebuild', async () => {
    const state = createState();
    const handlers = createHandlers();

    await applySettingsToggleMessage(
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

    await applySettingsToggleMessage(
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

    await expect(
      applySettingsToggleMessage({ type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } }, state, handlers),
    ).resolves.toBe(false);
  });
});
