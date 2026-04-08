import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '@/shared/graph/types';
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
    disabledSources: new Set<string>(),
    filterPatterns: [],
    graphData: { nodes: [], edges: [] } satisfies IGraphData,
    ...overrides,
  };
}

function createHandlers(
  overrides: Partial<GraphViewSettingsMessageHandlers> = {},
): GraphViewSettingsMessageHandlers {
    const handlers = {
      getConfig: vi.fn(<T>(_: string, defaultValue: T): T => defaultValue),
      updateConfig: vi.fn(() => Promise.resolve()),
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

describe('graph view settings toggle message', () => {
  it('disables sources and triggers a targeted rebuild', async () => {
    const state = createState();
    const handlers = createHandlers();

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_SOURCE',
        payload: { qualifiedSourceId: 'codegraphy.typescript:dynamic-import', enabled: false },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect([...state.disabledSources]).toEqual(['codegraphy.typescript:dynamic-import']);
    expect(state.disabledSources.has('codegraphy.typescript:dynamic-import')).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledSources', [
      'codegraphy.typescript:dynamic-import',
    ]);
    expect(handlers.smartRebuild).toHaveBeenCalledWith(
      'rule',
      'codegraphy.typescript:dynamic-import',
    );
  });

  it('re-enables sources and persists the reduced disabled-rule set', async () => {
    const state = createState({
      disabledSources: new Set(['codegraphy.typescript:dynamic-import']),
    });
    const handlers = createHandlers();

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_SOURCE',
        payload: { qualifiedSourceId: 'codegraphy.typescript:dynamic-import', enabled: true },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect([...state.disabledSources]).toEqual([]);
    expect(state.disabledSources.has('codegraphy.typescript:dynamic-import')).toBe(false);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledSources', []);
    expect(handlers.smartRebuild).toHaveBeenCalledWith(
      'rule',
      'codegraphy.typescript:dynamic-import',
    );
  });

  it('re-enables one rule without dropping other disabled sources', async () => {
    const state = createState({
      disabledSources: new Set([
        'codegraphy.typescript:dynamic-import',
        'codegraphy.python:unused-import',
      ]),
    });
    const handlers = createHandlers();

    await expect(
      applySettingsToggleMessage(
        {
          type: 'TOGGLE_SOURCE',
          payload: { qualifiedSourceId: 'codegraphy.typescript:dynamic-import', enabled: true },
        },
        state,
        handlers,
      ),
    ).resolves.toBe(true);

    expect([...state.disabledSources]).toEqual(['codegraphy.python:unused-import']);
    expect(handlers.updateConfig).toHaveBeenCalledWith('disabledSources', [
      'codegraphy.python:unused-import',
    ]);
  });

  it('re-enables plugins and reruns analysis', async () => {
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
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('disables plugins, persists the expanded disabled-plugin set, and reruns analysis', async () => {
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
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
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
