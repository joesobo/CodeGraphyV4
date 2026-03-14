import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  registerGraphViewExternalPlugin,
  type GraphViewExternalPluginRegistrationState,
} from '../../../src/extension/graphView/externalPluginRegistration';

function createState(
  overrides: Partial<GraphViewExternalPluginRegistrationState> = {},
): GraphViewExternalPluginRegistrationState {
  return {
    pluginExtensionUris: new Map<string, vscode.Uri>(),
    firstAnalysis: true,
    webviewReadyNotified: false,
    analyzerInitialized: true,
    analyzerInitPromise: undefined,
    analyzer: {
      registry: {
        register: vi.fn(),
        initializePlugin: vi.fn(async () => undefined),
        replayReadinessForPlugin: vi.fn(),
      },
    },
    ...overrides,
  };
}

describe('graphView/externalPluginRegistration', () => {
  it('registers external plugins, stores extension roots, and refreshes plugin webview state', async () => {
    const refreshWebviewResourceRoots = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendContextMenuItems = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const analyzeAndSendData = vi.fn(async () => undefined);
    const state = createState();
    const plugin = {
      id: 'plugin.test',
      name: 'Plugin',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
    };

    registerGraphViewExternalPlugin(
      plugin,
      { extensionUri: '/test/external-extension' },
      state,
      {
        normalizeExtensionUri: (uri) =>
          typeof uri === 'string' ? vscode.Uri.file(uri) : uri,
        getWorkspaceRoot: () => '/test/workspace',
        refreshWebviewResourceRoots,
        sendPluginStatuses,
        sendContextMenuItems,
        sendPluginWebviewInjections,
        analyzeAndSendData,
      },
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(state.pluginExtensionUris.get('plugin.test')?.fsPath).toBe('/test/external-extension');
    expect(state.analyzer?.registry.register).toHaveBeenCalledWith(plugin, {
      deferReadinessReplay: false,
    });
    expect(state.analyzer?.registry.initializePlugin).toHaveBeenCalledWith(
      'plugin.test',
      '/test/workspace',
    );
    expect(refreshWebviewResourceRoots).toHaveBeenCalledOnce();
    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendContextMenuItems).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('replays readiness instead of initializing immediately after the first analysis/webview-ready phase', async () => {
    const state = createState({
      firstAnalysis: false,
      webviewReadyNotified: true,
      analyzerInitialized: false,
    });
    const analyzeAndSendData = vi.fn(async () => undefined);

    registerGraphViewExternalPlugin(
      {
        id: 'plugin.test',
        name: 'Plugin',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        supportedExtensions: ['.ts'],
        detectConnections: async () => [],
      },
      undefined,
      state,
      {
        normalizeExtensionUri: () => undefined,
        getWorkspaceRoot: () => '/test/workspace',
        refreshWebviewResourceRoots: vi.fn(),
        sendPluginStatuses: vi.fn(),
        sendContextMenuItems: vi.fn(),
        sendPluginWebviewInjections: vi.fn(),
        analyzeAndSendData,
      },
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(state.analyzer?.registry.register).toHaveBeenCalledWith(expect.any(Object), {
      deferReadinessReplay: true,
    });
    expect(state.analyzer?.registry.replayReadinessForPlugin).toHaveBeenCalledWith('plugin.test');
    expect(state.analyzer?.registry.initializePlugin).not.toHaveBeenCalled();
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('ignores invalid plugin registrations when there is no analyzer or plugin id', () => {
    const refreshWebviewResourceRoots = vi.fn();

    registerGraphViewExternalPlugin(
      null,
      undefined,
      createState({ analyzer: undefined }),
      {
        normalizeExtensionUri: () => undefined,
        getWorkspaceRoot: () => undefined,
        refreshWebviewResourceRoots,
        sendPluginStatuses: vi.fn(),
        sendContextMenuItems: vi.fn(),
        sendPluginWebviewInjections: vi.fn(),
        analyzeAndSendData: vi.fn(),
      },
    );

    expect(refreshWebviewResourceRoots).not.toHaveBeenCalled();
  });
});
