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
      reloadWorkspacePlugins: vi.fn(() => Promise.resolve()),
      syncWorkspacePlugins: vi.fn(() => Promise.resolve()),
      sendPluginStatuses: vi.fn(),
      sendContextMenuItems: vi.fn(),
      sendPluginToolbarActions: vi.fn(),
      sendGraphViewContributionStatuses: vi.fn(),
      sendPluginWebviewInjections: vi.fn(),
      analyzeAndSendData: vi.fn(() => Promise.resolve()),
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
  it('handles plugin-id-only toggles as workspace plugin activity changes', async () => {
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
      { id: 'codegraphy.vue', enabled: false },
    ]);
    expect(handlers.smartRebuild).toHaveBeenCalledWith('codegraphy.vue');
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('disables package-backed plugins by persisting disabled plugin id intent', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { id: 'codegraphy.markdown', enabled: true },
            {
              id: 'codegraphy.vue',
              enabled: true,
              options: { includeTests: true },
            },
          ] as T;
        }
        return defaultValue;
      }),
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
      { id: 'codegraphy.markdown', enabled: true },
      {
        id: 'codegraphy.vue',
        enabled: false,
        options: { includeTests: true },
      },
    ]);
    expect(handlers.updateConfig).not.toHaveBeenCalledWith('disabledPlugins', expect.anything());
    expect(handlers.syncWorkspacePlugins).toHaveBeenCalledOnce();
    expect(handlers.reloadWorkspacePlugins).not.toHaveBeenCalled();
    expect(handlers.analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).toHaveBeenCalledWith('codegraphy.vue');
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('enables package-backed plugins by persisting enabled plugin id intent', async () => {
    const state = createState();
    const reprocessPluginFiles = vi.fn(() => Promise.resolve());
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.markdown', enabled: true }] as T;
        }
        return defaultValue;
      }),
      reprocessPluginFiles,
      analyzeAndSendData,
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
      { id: 'codegraphy.markdown', enabled: true },
      { id: 'codegraphy.vue', enabled: true },
    ]);
    expect(handlers.syncWorkspacePlugins).toHaveBeenCalledOnce();
    expect(handlers.reloadWorkspacePlugins).not.toHaveBeenCalled();
    expect(reprocessPluginFiles).toHaveBeenCalledWith(['codegraphy.vue']);
    expect(analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('copies plugin default options into workspace settings when enabling a package-backed plugin', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.markdown', enabled: true }] as T;
        }
        return defaultValue;
      }),
      getInstalledPluginDefaultOptions: vi.fn((pluginId: string) => {
        if (pluginId === 'codegraphy.godot') {
          return {
            includeSceneResources: true,
            includeAutoloads: true,
          };
        }
        return undefined;
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
      { id: 'codegraphy.markdown', enabled: true },
      {
        id: 'codegraphy.godot',
        enabled: true,
        options: {
          includeSceneResources: true,
          includeAutoloads: true,
        },
      },
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

  it('sends fresh graph view contribution statuses after package toggles sync plugins', async () => {
    const state = createState();
    const reloadWorkspacePlugins = vi.fn(() => Promise.resolve());
    const syncWorkspacePlugins = vi.fn(() => Promise.resolve());
    const sendGraphViewContributionStatuses = vi.fn();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
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
      reloadWorkspacePlugins,
      syncWorkspacePlugins,
      sendGraphViewContributionStatuses,
      analyzeAndSendData,
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
    expect(syncWorkspacePlugins).toHaveBeenCalledOnce();
    expect(reloadWorkspacePlugins).not.toHaveBeenCalled();
    expect(sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).toHaveBeenCalledWith('acme.graph-tools');
    expect(syncWorkspacePlugins.mock.invocationCallOrder[0])
      .toBeLessThan(sendGraphViewContributionStatuses.mock.invocationCallOrder[0]);
    expect(sendGraphViewContributionStatuses.mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(handlers.smartRebuild).mock.invocationCallOrder[0]);
  });

  it('sends graph controls after package toggles sync plugin contributions', async () => {
    const state = createState();
    const reloadWorkspacePlugins = vi.fn(() => Promise.resolve());
    const syncWorkspacePlugins = vi.fn(() => Promise.resolve());
    const sendGraphControls = vi.fn();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ id: 'codegraphy.markdown', enabled: true }] as T;
        }
        return defaultValue;
      }),
      reloadWorkspacePlugins,
      syncWorkspacePlugins,
      sendGraphControls,
      analyzeAndSendData,
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
    expect(syncWorkspacePlugins).toHaveBeenCalledOnce();
    expect(reloadWorkspacePlugins).not.toHaveBeenCalled();
    expect(syncWorkspacePlugins.mock.invocationCallOrder[0])
      .toBeLessThan(sendGraphControls.mock.invocationCallOrder[0]);
    expect(sendGraphControls.mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(handlers.smartRebuild).mock.invocationCallOrder[0]);
  });

  it('broadcasts package plugin cleanup before re-analysis when a package is toggled off', async () => {
    const state = createState();
    const reloadWorkspacePlugins = vi.fn(() => Promise.resolve());
    const syncWorkspacePlugins = vi.fn(() => Promise.resolve());
    const sendPluginStatuses = vi.fn();
    const sendContextMenuItems = vi.fn();
    const sendPluginToolbarActions = vi.fn();
    const sendGraphViewContributionStatuses = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
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
      reloadWorkspacePlugins,
      syncWorkspacePlugins,
      sendPluginStatuses,
      sendContextMenuItems,
      sendPluginToolbarActions,
      sendGraphViewContributionStatuses,
      sendPluginWebviewInjections,
      analyzeAndSendData,
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
    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendContextMenuItems).toHaveBeenCalledOnce();
    expect(sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).not.toHaveBeenCalled();
    expect(sendPluginStatuses.mock.invocationCallOrder[0])
      .toBeGreaterThan(syncWorkspacePlugins.mock.invocationCallOrder[0]);
    expect(sendPluginStatuses.mock.invocationCallOrder[0])
      .toBeLessThan(vi.mocked(handlers.smartRebuild).mock.invocationCallOrder[0]);
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('sends plugin webview injections before plugin file reprocessing after package toggles', async () => {
    const state = createState();
    const sendPluginWebviewInjections = vi.fn();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const reprocessPluginFiles = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [] as T;
        }
        return defaultValue;
      }),
      sendPluginWebviewInjections,
      analyzeAndSendData,
      reprocessPluginFiles,
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
    expect(reprocessPluginFiles).toHaveBeenCalledWith(['codegraphy.organize']);
    expect(analyzeAndSendData).not.toHaveBeenCalled();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections.mock.invocationCallOrder[0])
      .toBeLessThan(reprocessPluginFiles.mock.invocationCallOrder[0]);
  });

  it('sends webview injections immediately after enabling a package-backed UI plugin', async () => {
    const state = createState();
    const sendPluginWebviewInjections = vi.fn();
    const syncWorkspacePlugins = vi.fn(() => Promise.resolve());
    const reprocessPluginFiles = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [] as T;
        }
        return defaultValue;
      }),
      syncWorkspacePlugins,
      sendPluginWebviewInjections,
      reprocessPluginFiles,
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
    const syncOrder = syncWorkspacePlugins.mock.invocationCallOrder[0];
    const reprocessOrder = reprocessPluginFiles.mock.invocationCallOrder[0];
    expect(injectionOrder).toEqual(expect.any(Number));
    expect(syncOrder).toEqual(expect.any(Number));
    expect(reprocessOrder).toEqual(expect.any(Number));
    expect(injectionOrder).toBeGreaterThan(syncOrder as number);
    expect(injectionOrder).toBeLessThan(reprocessOrder as number);
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
