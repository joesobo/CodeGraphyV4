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
  it('ignores legacy plugin-id-only toggles', async () => {
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

    expect(handled).toBe(false);
    expect(handlers.updateConfig).not.toHaveBeenCalled();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('disables package-backed plugins by removing them from the workspace plugins list', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { package: '@codegraphy-dev/plugin-markdown' },
            {
              package: '@codegraphy-dev/plugin-python',
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
          pluginId: 'codegraphy.python',
          packageName: '@codegraphy-dev/plugin-python',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { package: '@codegraphy-dev/plugin-markdown' },
    ]);
    expect(handlers.updateConfig).not.toHaveBeenCalledWith('disabledPlugins', expect.anything());
    expect(handlers.reloadWorkspacePlugins).toHaveBeenCalledOnce();
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('removes package-backed plugins from workspace plugins when toggled off', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { package: '@codegraphy-dev/plugin-markdown' },
            { package: '@acme/graph-tools' },
          ] as T;
        }
        return defaultValue;
      }),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'acme.graph-tools',
          packageName: '@acme/graph-tools',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { package: '@codegraphy-dev/plugin-markdown' },
    ]);
    expect(handlers.reloadWorkspacePlugins).toHaveBeenCalledOnce();
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('enables package-backed plugins by adding them to the workspace plugins list', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ package: '@codegraphy-dev/plugin-markdown' }] as T;
        }
        return defaultValue;
      }),
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.python',
          packageName: '@codegraphy-dev/plugin-python',
          enabled: true,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { package: '@codegraphy-dev/plugin-markdown' },
      { package: '@codegraphy-dev/plugin-python' },
    ]);
    expect(handlers.reloadWorkspacePlugins).toHaveBeenCalledOnce();
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
  });

  it('copies package default options into workspace settings when enabling a package-backed plugin', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ package: '@codegraphy-dev/plugin-markdown' }] as T;
        }
        return defaultValue;
      }),
      getInstalledPluginDefaultOptions: vi.fn((packageName: string) => {
        if (packageName === '@codegraphy-dev/plugin-godot') {
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
          packageName: '@codegraphy-dev/plugin-godot',
          enabled: true,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.updateConfig).toHaveBeenCalledWith('plugins', [
      { package: '@codegraphy-dev/plugin-markdown' },
      {
        package: '@codegraphy-dev/plugin-godot',
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

  it('reloads package plugins instead of only rebuilding cached plugin edges', async () => {
    const state = createState();
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [{ package: '@codegraphy-dev/plugin-python' }] as T;
        }
        return defaultValue;
      }),
      reprocessPluginFiles: vi.fn(() => new Promise<void>(() => undefined)),
    });
    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'codegraphy.python',
          packageName: '@codegraphy-dev/plugin-python',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(handlers.reloadWorkspacePlugins).toHaveBeenCalledOnce();
    expect(handlers.analyzeAndSendData).toHaveBeenCalledOnce();
    expect(handlers.smartRebuild).not.toHaveBeenCalled();
    expect(handlers.reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('sends fresh graph view contribution statuses after package toggles reload plugins', async () => {
    const state = createState();
    const reloadWorkspacePlugins = vi.fn(() => Promise.resolve());
    const sendGraphViewContributionStatuses = vi.fn();
    const analyzeAndSendData = vi.fn(() => Promise.resolve());
    const handlers = createHandlers({
      getConfig: vi.fn(<T>(key: string, defaultValue: T): T => {
        if (key === 'plugins') {
          return [
            { package: '@codegraphy-dev/plugin-markdown' },
            { package: '@acme/graph-tools' },
          ] as T;
        }
        return defaultValue;
      }),
      reloadWorkspacePlugins,
      sendGraphViewContributionStatuses,
      analyzeAndSendData,
    });

    const handled = await applySettingsToggleMessage(
      {
        type: 'TOGGLE_PLUGIN',
        payload: {
          pluginId: 'acme.graph-tools',
          packageName: '@acme/graph-tools',
          enabled: false,
        },
      },
      state,
      handlers,
    );

    expect(handled).toBe(true);
    expect(reloadWorkspacePlugins).toHaveBeenCalledOnce();
    expect(sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
    expect(reloadWorkspacePlugins.mock.invocationCallOrder[0])
      .toBeLessThan(sendGraphViewContributionStatuses.mock.invocationCallOrder[0]);
    expect(sendGraphViewContributionStatuses.mock.invocationCallOrder[0])
      .toBeLessThan(analyzeAndSendData.mock.invocationCallOrder[0]);
  });

  it('broadcasts package plugin cleanup before re-analysis when a package is toggled off', async () => {
    const state = createState();
    const reloadWorkspacePlugins = vi.fn(() => Promise.resolve());
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
            { package: '@codegraphy-dev/plugin-markdown' },
            { package: '@acme/graph-tools' },
          ] as T;
        }
        return defaultValue;
      }),
      reloadWorkspacePlugins,
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
          packageName: '@acme/graph-tools',
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
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(sendPluginStatuses.mock.invocationCallOrder[0])
      .toBeGreaterThan(reloadWorkspacePlugins.mock.invocationCallOrder[0]);
    expect(sendPluginStatuses.mock.invocationCallOrder[0])
      .toBeLessThan(analyzeAndSendData.mock.invocationCallOrder[0]);
    expect(sendPluginWebviewInjections.mock.invocationCallOrder[0])
      .toBeLessThan(analyzeAndSendData.mock.invocationCallOrder[0]);
  });
});
