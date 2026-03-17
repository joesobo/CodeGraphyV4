import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/types';
import {
  applySettingsToggleMessage,
} from '../../../../../src/extension/graphView/messages/settings/toggle';
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

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_RULE',
        payload: { qualifiedId: 'codegraphy.typescript:dynamic-import', enabled: false },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect([...state.disabledRules]).toEqual(['codegraphy.typescript:dynamic-import']);
    expect(state.disabledRules.has('codegraphy.typescript:dynamic-import')).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledRules', [
      'codegraphy.typescript:dynamic-import',
    ]);
    expect(handlers.smartRebuild).toHaveBeenCalledWith(
      'rule',
      'codegraphy.typescript:dynamic-import',
    );
  });

  it('re-enables rules and persists the reduced disabled-rule set', async () => {
    const state = createState({
      disabledRules: new Set(['codegraphy.typescript:dynamic-import']),
    });
    const handlers = createHandlers();

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_RULE',
        payload: { qualifiedId: 'codegraphy.typescript:dynamic-import', enabled: true },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect([...state.disabledRules]).toEqual([]);
    expect(state.disabledRules.has('codegraphy.typescript:dynamic-import')).toBe(false);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledRules', []);
    expect(handlers.smartRebuild).toHaveBeenCalledWith(
      'rule',
      'codegraphy.typescript:dynamic-import',
    );
  });

  it('re-enables one rule without dropping other disabled rules', async () => {
    const state = createState({
      disabledRules: new Set([
        'codegraphy.typescript:dynamic-import',
        'codegraphy.python:unused-import',
      ]),
    });
    const handlers = createHandlers();

    await expect(
      applySettingsToggleMessage(
        {
          type: 'TOGGLE_RULE',
          payload: { qualifiedId: 'codegraphy.typescript:dynamic-import', enabled: true },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect([...state.disabledRules]).toEqual(['codegraphy.python:unused-import']);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledRules', [
      'codegraphy.python:unused-import',
    ]);
  });

  it('re-enables plugins and triggers a targeted rebuild', async () => {
    const state = createState({
      disabledPlugins: new Set(['codegraphy.python']),
    });
    const handlers = createHandlers();

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.python', enabled: true },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect([...state.disabledPlugins]).toEqual([]);
    expect(state.disabledPlugins.has('codegraphy.python')).toBe(false);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledPlugins', []);
    expect(handlers.smartRebuild).toHaveBeenCalledWith('plugin', 'codegraphy.python');
  });

  it('disables plugins and persists the expanded disabled-plugin set', async () => {
    const state = createState();
    const handlers = createHandlers();

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.python', enabled: false },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect([...state.disabledPlugins]).toEqual(['codegraphy.python']);
    expect(state.disabledPlugins.has('codegraphy.python')).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledPlugins', [
      'codegraphy.python',
    ]);
    expect(handlers.smartRebuild).toHaveBeenCalledWith('plugin', 'codegraphy.python');
  });

  it('disables one plugin without dropping existing disabled plugins', async () => {
    const state = createState({
      disabledPlugins: new Set(['codegraphy.typescript']),
    });
    const handlers = createHandlers();

    await expect(
      applySettingsToggleMessage(
        {
          type: 'TOGGLE_PLUGIN',
          payload: { pluginId: 'codegraphy.python', enabled: false },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect([...state.disabledPlugins]).toEqual([
      'codegraphy.typescript',
      'codegraphy.python',
    ]);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledPlugins', [
      'codegraphy.typescript',
      'codegraphy.python',
    ]);
  });

  it('returns false for unrelated messages', async () => {
    const state = createState();
    const handlers = createHandlers();

    const handled = await applySettingsToggleMessage(
      { type: 'UPDATE_SHOW_LABELS', payload: { showLabels: false } },
      state,
      handlers,
    );

    expect(handled).toBe(false);
  });
});
