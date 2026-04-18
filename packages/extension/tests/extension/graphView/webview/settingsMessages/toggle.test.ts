import { describe, expect, it, vi } from 'vitest';
import {
  applySettingsToggleMessage,
} from '../../../../../src/extension/graphView/webview/settingsMessages/toggle';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
    disabledPlugins: new Set<string>(),
    filterPatterns: [],
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewSettingsMessageHandlers> = {},
): GraphViewSettingsMessageHandlers {
    const handlers = {
      getConfig: vi.fn(<T>(_: string, defaultValue: T): T => defaultValue),
      updateConfig: vi.fn(() => Promise.resolve()),
      smartRebuild: vi.fn(),
      getPluginFilterPatterns: vi.fn(() => []),
      sendGraphControls: vi.fn(),
      reprocessPluginFiles: vi.fn(() => Promise.resolve()),
      sendMessage: vi.fn(),
      resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  handlers.sendGraphControls ??= vi.fn();

  return handlers as GraphViewSettingsMessageHandlers;
}

describe('graph view settings toggle message', () => {
  it('re-enables plugins, persists the disabled-plugin list, and rebuilds cached plugin edges', async () => {
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
    expect(handlers.smartRebuild).toHaveBeenCalledWith('codegraphy.python');
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('disables plugins, persists the expanded disabled-plugin set, and rebuilds cached plugin edges', async () => {
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
    expect(handlers.smartRebuild).toHaveBeenCalledWith('codegraphy.python');
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
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
      { type: 'UPDATE_EDGE_VISIBILITY', payload: { edgeKind: 'CALLS', visible: false } },
      state,
      handlers,
    );

    expect(handled).toBe(false);
  });

  it('returns immediately because toggles rebuild cached plugin edges instead of reprocessing files', async () => {
    const state = createState();
    const handlers = createHandlers({
      reprocessPluginFiles: vi.fn(() => new Promise<void>(() => undefined)),
    });
    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.python', enabled: false },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.smartRebuild).toHaveBeenCalledWith('codegraphy.python');
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });
});
