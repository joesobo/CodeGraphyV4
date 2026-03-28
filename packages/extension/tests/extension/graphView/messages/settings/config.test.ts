import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/contracts';
import {
  applySettingsConfigMessage,
} from '../../../../../src/extension/graphView/messages/settings/config';
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

describe('graph view settings config message', () => {
  it('delegates reset-all requests', async () => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsConfigMessage({ type: 'RESET_ALL_SETTINGS' }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.resetAllSettings).toHaveBeenCalledOnce();
  });

  it('updates filter patterns and publishes plugin patterns', async () => {
    const state = createState();
    const handlers = createHandlers({
      getPluginFilterPatterns: vi.fn(() => ['venv/**']),
    });

    await applySettingsConfigMessage(
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

  it.each([
    ['UPDATE_SHOW_ORPHANS', { showOrphans: false }, 'showOrphans', false],
    ['UPDATE_BIDIRECTIONAL_MODE', { bidirectionalMode: 'combined' }, 'bidirectionalEdges', 'combined'],
    ['UPDATE_PARTICLE_SETTING', { key: 'particleSpeed', value: 0.2 }, 'particleSpeed', 0.2],
    ['UPDATE_MAX_FILES', { maxFiles: 250 }, 'maxFiles', 250],
  ] as const)('persists %s through config updates', async (type, payload, key, value) => {
    const state = createState();
    const handlers = createHandlers();

    await expect(
      applySettingsConfigMessage({ type, payload }, state, handlers),
    ).resolves.toBe(true);

    expect(handlers.updateConfig).toHaveBeenCalledWith(key, value);
  });

  it('updates label visibility and publishes it immediately', async () => {
    const state = createState();
    const handlers = createHandlers();

    await applySettingsConfigMessage(
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
      applySettingsConfigMessage({ type: 'TOGGLE_RULE', payload: { qualifiedId: 'x', enabled: false } }, state, handlers),
    ).resolves.toBe(false);
  });
});
