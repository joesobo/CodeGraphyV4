import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '@/shared/graph/types';
import {
  applySettingsUpdateMessage,
} from '../../../../../src/extension/graphView/webview/settingsMessages/updates';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

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
      payload: { patterns: ['dist/**'], pluginPatterns: ['venv/**'] },
    });
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
      applySettingsUpdateMessage({ type: 'TOGGLE_RULE', payload: { qualifiedId: 'x', enabled: false } }, state, handlers),
    ).resolves.toBe(false);
  });
});
