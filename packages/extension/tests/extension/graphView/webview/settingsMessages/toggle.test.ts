import { describe, expect, it, vi } from 'vitest';
import {
  applySettingsToggleMessage,
} from '../../../../../src/extension/graphView/webview/settingsMessages/toggle';
import type { IPluginFilterPatternGroup } from '../../../../../src/shared/protocol/extensionToWebview';
import type {
  GraphViewSettingsMessageHandlers,
  GraphViewSettingsMessageState,
} from '../../../../../src/extension/graphView/webview/settingsMessages/router';

function createState(
  overrides: Partial<GraphViewSettingsMessageState> = {},
): GraphViewSettingsMessageState {
  return {
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
      sendPluginStatuses: vi.fn(),
      sendPluginWebviewInjections: vi.fn(),
      getInstalledPluginUpdateImpact: vi.fn(() => undefined),
      reloadCachedGraph: vi.fn(() => Promise.resolve()),
      smartRebuild: vi.fn(),
      getPluginFilterPatterns: vi.fn(() => []),
      getPluginFilterGroups: vi.fn(() => []),
      sendGraphControls: vi.fn(),
      hydratePluginGraphScope: vi.fn(() => Promise.resolve(false)),
      sendMessage: vi.fn(),
      resetAllSettings: vi.fn(() => Promise.resolve()),
    ...overrides,
  };

  handlers.sendGraphControls ??= vi.fn();

  return handlers as GraphViewSettingsMessageHandlers;
}

describe('graph view settings toggle message', () => {
  it('uses a safe workspace analysis when disabling a plugin without impact metadata', async () => {
    const state = createState();
    const handlers = createHandlers();

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.vue', enabled: false },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { id: 'codegraphy.vue', activation: 'disabled' },
    ]);
    expect(handlers.reloadCachedGraph).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('uses projection-only plugin impact metadata without scheduling index work', async () => {
    const state = createState();
    const handlers = createHandlers({
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'projection-only' as const,
      })),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.particles', enabled: true },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.reloadCachedGraph).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).toHaveBeenCalledWith('codegraphy.particles');
  });

  it('uses plugin analysis impact metadata for targeted plugin-file reprocessing', async () => {
    const state = createState();
    const handlers = createHandlers({
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'reanalyze-plugin-files' as const,
      })),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.vue', enabled: true },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.reloadCachedGraph).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('waits for targeted plugin-file reprocessing instead of leaving it queued', async () => {
    const state = createState();
    const schedulePluginGraphWork = vi.fn();
    const reloadCachedGraph = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'reanalyze-plugin-files' as const,
      })),
      schedulePluginGraphWork,
      reloadCachedGraph,
    });

    await expect(applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.svelte', enabled: true },
      },
      state,
      handlers,
    )).resolves.toBe(true);

    expect(reloadCachedGraph).toHaveBeenCalledOnce();
    expect(schedulePluginGraphWork).not.toHaveBeenCalled();
  });

  it('reprocesses plugin files after enable even when cached plugin evidence is available', async () => {
    const state = createState();
    const handlers = createHandlers({
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'reanalyze-plugin-files' as const,
      })),
      hydratePluginGraphScope: vi.fn(() => Promise.resolve(true)),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: { pluginId: 'codegraphy.vue', enabled: true },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.reloadCachedGraph).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('disables package-backed plugins by persisting disabled plugin id intent', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { id: 'codegraphy.markdown', activation: 'enabled' },
            {
              id: 'codegraphy.vue',
              activation: 'enabled',
              options: { includeTests: true },
            },
          ] as T;
        }
        return defaultValue;
      }),
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'reanalyze-plugin-files' as const,
      })),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.vue',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { id: 'codegraphy.markdown', activation: 'enabled' },
      {
        id: 'codegraphy.vue',
        activation: 'disabled',
        options: { includeTests: true },
      },
    ]);
    expect(handlers.updateConfig).not.toHaveBeenCalledWith('disabledPlugins', expect.anything());
    expect(handlers.reloadCachedGraph).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('enables package-backed plugins by persisting enabled plugin id intent', async () => {
    const state = createState();
    const reloadCachedGraph = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.markdown', activation: 'enabled' }] as T;
        }
        return defaultValue;
      }),
      reloadCachedGraph,
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.vue',
          enabled: true,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { id: 'codegraphy.markdown', activation: 'enabled' },
      { id: 'codegraphy.vue', activation: 'enabled' },
    ]);
    expect(reloadCachedGraph).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('reanalyzes the workspace when disabling a package-backed Core plugin', async () => {
    const state = createState();
    const reloadCachedGraph = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.unity', enabled: true }] as T;
        }
        return defaultValue;
      }),
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'reanalyze-plugin-files' as const,
      })),
      reloadCachedGraph,
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.unity',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(reloadCachedGraph).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('keeps package defaults out of workspace settings when enabling a package-backed plugin', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.markdown', activation: 'enabled' }] as T;
        }
        return defaultValue;
      }),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.godot',
          enabled: true,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { id: 'codegraphy.markdown', activation: 'enabled' },
      { id: 'codegraphy.godot', activation: 'enabled' },
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

  it('sends fresh graph view contribution statuses after package toggles', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { id: 'codegraphy.markdown', enabled: true },
            { id: 'acme.graph-tools', enabled: true },
          ] as T;
        }
        return defaultValue;
      }),
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'projection-only' as const,
      })),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'acme.graph-tools',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.reloadCachedGraph).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).toHaveBeenCalledWith('acme.graph-tools');
  });

  it('sends graph controls after package toggle graph work finishes', async () => {
    const state = createState();
    const sendGraphControls = vi.fn();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.markdown', enabled: true }] as T;
        }
        return defaultValue;
      }),
      sendGraphControls,
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'projection-only' as const,
      })),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.vue',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(sendGraphControls).toHaveBeenCalledOnce();
    expect(sendGraphControls.mock.invocationCallOrder[0])
      .toBeGreaterThan(vi.mocked(handlers.smartRebuild).mock.invocationCallOrder[0]);
  });

  it('sends fresh filter patterns after package toggles', async () => {
    const state = createState({ filterPatterns: ['dist/**'] });
    const pluginFilterGroups: IPluginFilterPatternGroup[] = [{
      pluginId: 'codegraphy.unity',
      pluginName: 'Unity',
      patterns: ['**/*.meta', 'ProjectSettings/**'],
    }];
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.unity', enabled: true }] as T;
        }
        if (key === 'disabledCustomFilterPatterns') {
          return ['dist/**'] as T;
        }
        if (key === 'disabledPluginFilterPatterns') {
          return ['**/*.meta'] as T;
        }
        return defaultValue;
      }),
      getPluginFilterPatterns: vi.fn(() => ['**/*.meta', 'ProjectSettings/**']),
      getPluginFilterGroups: vi.fn(() => pluginFilterGroups),
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'reanalyze-plugin-files' as const,
      })),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.unity',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.sendMessage).toHaveBeenCalledWith({
      type: 'FILTER_PATTERNS_UPDATED',
      payload: {
        patterns: ['dist/**'],
        pluginPatterns: ['**/*.meta', 'ProjectSettings/**'],
        pluginPatternGroups: pluginFilterGroups,
        disabledCustomPatterns: ['dist/**'],
        disabledPluginPatterns: ['**/*.meta'],
      },
    });
    expect(vi.mocked(handlers.getPluginFilterPatterns).mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(handlers.reloadCachedGraph).mock.invocationCallOrder[0]);
  });

  it('confirms plugin status after graph projection finishes', async () => {
    const state = createState();
    const sendPluginStatuses = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { id: 'codegraphy.markdown', enabled: true },
            { id: 'acme.graph-tools', enabled: true },
          ] as T;
        }
        return defaultValue;
      }),
      sendPluginStatuses,
      sendPluginWebviewInjections,
      getInstalledPluginUpdateImpact: vi.fn(() => ({
        toggle: 'projection-only' as const,
      })),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'acme.graph-tools',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(sendPluginStatuses).toHaveBeenCalledTimes(2);
    expect(sendPluginWebviewInjections).not.toHaveBeenCalled();
    expect(sendPluginStatuses.mock.invocationCallOrder[1])
      .toBeGreaterThan(vi.mocked(handlers.smartRebuild).mock.invocationCallOrder[0]);
    expect(handlers.reloadCachedGraph).not.toHaveBeenCalled();
  });

  it('deactivates a disabled plugin in the webview before graph projection finishes', async () => {
    const state = createState();
    let finishProjection!: () => void;
    let markProjectionStarted!: () => void;
    const projectionStarted = new Promise<void>((resolve) => {
      markProjectionStarted = resolve;
    });
    const projectionGate = new Promise<void>((resolve) => {
      finishProjection = resolve;
    });
    const sendPluginStatuses = vi.fn();
    const smartRebuild = vi.fn(async () => {
      markProjectionStarted();
      await projectionGate;
    });
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.particles', activation: 'enabled' }] as T;
        }
        return defaultValue;
      }),
      getInstalledPluginUpdateImpact: vi.fn((): { toggle: 'projection-only' } => ({
        toggle: 'projection-only',
      })),
      sendPluginStatuses,
      smartRebuild,
    });

    const toggle = applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.particles',
          enabled: false,
        },
      },
      state,
      handlers,
    );
    await projectionStarted;

    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendPluginStatuses.mock.invocationCallOrder[0])
      .toBeLessThan(smartRebuild.mock.invocationCallOrder[0] as number);

    finishProjection();
    await toggle;
    expect(sendPluginStatuses).toHaveBeenCalledTimes(2);
  });

  it('sends plugin webview injections before workspace analysis after package toggles', async () => {
    const state = createState();
    const sendPluginWebviewInjections = vi.fn();
    const reloadCachedGraph = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [] as T;
        }
        return defaultValue;
      }),
      sendPluginWebviewInjections,
      reloadCachedGraph,
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.organize',
          enabled: true,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(reloadCachedGraph).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections.mock.invocationCallOrder[0])
      .toBeLessThan(reloadCachedGraph.mock.invocationCallOrder[0]);
  });

  it('sends webview injections immediately after enabling a package-backed UI plugin', async () => {
    const state = createState();
    const sendPluginWebviewInjections = vi.fn();
    const reloadCachedGraph = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [] as T;
        }
        return defaultValue;
      }),
      sendPluginWebviewInjections,
      reloadCachedGraph,
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.particles',
          enabled: true,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    const injectionOrder = sendPluginWebviewInjections.mock.invocationCallOrder[0];
    const analyzeOrder = vi.mocked(handlers.reloadCachedGraph).mock.invocationCallOrder[0];
    expect(injectionOrder).toEqual(expect.any(Number));
    expect(analyzeOrder).toEqual(expect.any(Number));
    expect(injectionOrder).toBeLessThan(analyzeOrder as number);
  });

  it('replays saved plugin data before injecting a newly enabled plugin webview', async () => {
    const state = createState();
    const sendMessage = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [] as T;
        }
        if (key === 'pluginData') {
          return {
            'codegraphy.particles': {
              enabled: true,
              preset: 'embers',
            },
          } as T;
        }
        return defaultValue;
      }),
      sendMessage,
      sendPluginWebviewInjections,
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.particles',
          enabled: true,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_DATA_UPDATED',
      payload: {
        pluginId: 'codegraphy.particles',
        data: {
          enabled: true,
          preset: 'embers',
        },
      },
    });
    expect(sendMessage.mock.invocationCallOrder[0])
      .toBeLessThan(sendPluginWebviewInjections.mock.invocationCallOrder[0]);
  });
});
