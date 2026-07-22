import { describe, expect, it, vi } from 'vitest';
import {
  createHandlers,
  createState,
  flushPluginRegistration,
  vscode,
} from './registration.fixture';
import {
  registerGraphViewExternalPlugin,
} from '../../../../../src/extension/graphView/webview/plugins/registration/register';

describe('graphView/webview/plugins/registration', () => {
  it('registers external plugins, stores extension roots, and refreshes plugin webview state', async () => {
    const refreshWebviewResourceRoots = vi.fn();
    const sendDepthState = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendContextMenuItems = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const reprocessPluginFiles = vi.fn(async () => undefined);
    const state = createState();
    const plugin = {
      id: 'plugin.test',
      name: 'Plugin',
      version: '1.0.0',
      apiVersion: '^4.0.0',
      supportedExtensions: ['.ts'],
      analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
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
        sendDepthState,
        sendPluginStatuses,
        sendContextMenuItems,
        sendPluginWebviewInjections,
        reprocessPluginFiles,
      },
    );

    await flushPluginRegistration();

    expect(state.pluginExtensionUris.get('plugin.test')?.fsPath).toBe('/test/external-extension');
    expect(state.analyzer?.registry.register).toHaveBeenCalledWith(plugin, {
      deferReadinessReplay: false,
    });
    expect(state.analyzer?.clearCache).not.toHaveBeenCalled();
    expect(state.analyzer?.registry.initializePlugin).toHaveBeenCalledWith(
      'plugin.test',
      '/test/workspace',
    );
    expect(refreshWebviewResourceRoots).toHaveBeenCalledOnce();
    expect(sendDepthState).toHaveBeenCalledOnce();
    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendContextMenuItems).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('defers readiness replay after first analysis even before the webview is marked ready', async () => {
    const state = createState({
      firstAnalysis: false,
      readyNotified: false,
      analyzerInitialized: false,
    });

    registerGraphViewExternalPlugin(
      {
        id: 'plugin.test',
        name: 'Plugin',
        version: '1.0.0',
        apiVersion: '^4.0.0',
        supportedExtensions: ['.ts'],
        analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
      },
      undefined,
      state,
      createHandlers(),
    );

    await flushPluginRegistration();

    expect(state.analyzer?.registry.register).toHaveBeenCalledWith(expect.any(Object), {
      deferReadinessReplay: true,
    });
    expect(state.analyzer?.registry.replayReadinessForPlugin).toHaveBeenCalledWith('plugin.test');
    expect(state.analyzer?.clearCache).not.toHaveBeenCalled();
  });

  it('replays readiness and still initializes the plugin after the first analysis/webview-ready phase', async () => {
    const state = createState({
      firstAnalysis: false,
      readyNotified: true,
      analyzerInitialized: false,
    });
    const reprocessPluginFiles = vi.fn(async () => undefined);

    registerGraphViewExternalPlugin(
      {
        id: 'plugin.test',
        name: 'Plugin',
        version: '1.0.0',
        apiVersion: '^4.0.0',
        supportedExtensions: ['.ts'],
        analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
      },
      undefined,
      state,
      createHandlers({ reprocessPluginFiles }),
    );

    await flushPluginRegistration();

    expect(state.analyzer?.registry.register).toHaveBeenCalledWith(expect.any(Object), {
      deferReadinessReplay: true,
    });
    expect(state.analyzer?.registry.replayReadinessForPlugin).toHaveBeenCalledWith('plugin.test');
    expect(state.analyzer?.registry.initializePlugin).toHaveBeenCalledWith(
      'plugin.test',
      '/test/workspace',
    );
    expect(state.analyzer?.clearCache).not.toHaveBeenCalled();
    expect(reprocessPluginFiles).not.toHaveBeenCalled();
  });

  it('skips plugin initialization when there is no workspace root', async () => {
    const refreshWebviewResourceRoots = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendContextMenuItems = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const reprocessPluginFiles = vi.fn(async () => undefined);
    const state = createState();

    registerGraphViewExternalPlugin(
      {
        id: 'plugin.test',
        name: 'Plugin',
        version: '1.0.0',
        apiVersion: '^4.0.0',
        supportedExtensions: ['.ts'],
        analyzeFile: async (filePath: string) => ({ filePath, relations: [] }),
      },
      undefined,
      state,
      {
        normalizeExtensionUri: () => undefined,
        getWorkspaceRoot: () => undefined,
        refreshWebviewResourceRoots,
        sendDepthState: vi.fn(),
        sendPluginStatuses,
        sendContextMenuItems,
        sendPluginWebviewInjections,
        reprocessPluginFiles,
      },
    );

    await flushPluginRegistration();

    expect(state.analyzer?.registry.initializePlugin).not.toHaveBeenCalled();
    expect(refreshWebviewResourceRoots).toHaveBeenCalledOnce();
    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendContextMenuItems).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(state.analyzer?.clearCache).not.toHaveBeenCalled();
    expect(reprocessPluginFiles).not.toHaveBeenCalled();
  });

});
