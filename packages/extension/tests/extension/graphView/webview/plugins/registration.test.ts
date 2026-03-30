import { describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import {
  registerGraphViewExternalPlugin,
  type GraphViewExternalPluginRegistrationState,
} from '../../../../../src/extension/graphView/webview/plugins/registration';

function createState(
  overrides: Partial<GraphViewExternalPluginRegistrationState> = {},
): GraphViewExternalPluginRegistrationState {
  return {
    pluginExtensionUris: new Map<string, vscode.Uri>(),
    firstAnalysis: true,
    readyNotified: false,
    analyzerInitialized: true,
    analyzerInitPromise: undefined,
    analyzer: {
      clearCache: vi.fn(),
      registry: {
        register: vi.fn(),
        initializePlugin: vi.fn(async () => undefined),
        replayReadinessForPlugin: vi.fn(),
      },
    },
    ...overrides,
  };
}

describe('graphView/webview/plugins/registration', () => {
  it('ignores plugin registrations when the plugin value is not an object', () => {
    const state = createState();
    const refreshWebviewResourceRoots = vi.fn();

    registerGraphViewExternalPlugin(
      'plugin.test',
      undefined,
      state,
      {
        normalizeExtensionUri: () => undefined,
        getWorkspaceRoot: () => '/test/workspace',
        refreshWebviewResourceRoots,
        sendPluginStatuses: vi.fn(),
        sendContextMenuItems: vi.fn(),
        sendPluginWebviewInjections: vi.fn(),
        analyzeAndSendData: vi.fn(),
      },
    );

    expect(state.analyzer?.registry.register).not.toHaveBeenCalled();
    expect(refreshWebviewResourceRoots).not.toHaveBeenCalled();
  });

  it('ignores plugin registrations when the plugin object has no id', () => {
    const state = createState();
    const refreshWebviewResourceRoots = vi.fn();

    registerGraphViewExternalPlugin(
      {
        name: 'Plugin without id',
      },
      undefined,
      state,
      {
        normalizeExtensionUri: () => undefined,
        getWorkspaceRoot: () => '/test/workspace',
        refreshWebviewResourceRoots,
        sendPluginStatuses: vi.fn(),
        sendContextMenuItems: vi.fn(),
        sendPluginWebviewInjections: vi.fn(),
        analyzeAndSendData: vi.fn(),
      },
    );

    expect(state.analyzer?.registry.register).not.toHaveBeenCalled();
    expect(refreshWebviewResourceRoots).not.toHaveBeenCalled();
  });

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
    expect(state.analyzer?.clearCache).toHaveBeenCalledOnce();
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
        analyzeAndSendData: vi.fn(async () => undefined),
      },
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(state.analyzer?.registry.register).toHaveBeenCalledWith(expect.any(Object), {
      deferReadinessReplay: true,
    });
    expect(state.analyzer?.registry.replayReadinessForPlugin).toHaveBeenCalledWith('plugin.test');
  });

  it('replays readiness and still initializes the plugin after the first analysis/webview-ready phase', async () => {
    const state = createState({
      firstAnalysis: false,
      readyNotified: true,
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
    expect(state.analyzer?.registry.initializePlugin).toHaveBeenCalledWith(
      'plugin.test',
      '/test/workspace',
    );
    expect(analyzeAndSendData).not.toHaveBeenCalled();
  });

  it('skips plugin initialization when there is no workspace root', async () => {
    const refreshWebviewResourceRoots = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendContextMenuItems = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const analyzeAndSendData = vi.fn(async () => undefined);
    const state = createState();

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
        getWorkspaceRoot: () => undefined,
        refreshWebviewResourceRoots,
        sendPluginStatuses,
        sendContextMenuItems,
        sendPluginWebviewInjections,
        analyzeAndSendData,
      },
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(state.analyzer?.registry.initializePlugin).not.toHaveBeenCalled();
    expect(refreshWebviewResourceRoots).toHaveBeenCalledOnce();
    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendContextMenuItems).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });

  it('waits for analyzer initialization to settle before replaying readiness and reanalyzing', async () => {
    let analyzerInitialized = false;
    let resolveAnalyzerInit: (() => void) | undefined;
    const analyzerInitPromise = new Promise<void>((resolve) => {
      resolveAnalyzerInit = () => {
        analyzerInitialized = true;
        resolve();
      };
    });
    const initializePlugin = vi.fn(async () => undefined);
    const replayReadinessForPlugin = vi.fn();
    const analyzeAndSendData = vi.fn(async () => undefined);
    const state: GraphViewExternalPluginRegistrationState = {
      pluginExtensionUris: new Map<string, vscode.Uri>(),
      analyzer: {
        clearCache: vi.fn(),
        registry: {
          register: vi.fn(),
          initializePlugin,
          replayReadinessForPlugin,
        },
      },
      get firstAnalysis() {
        return false;
      },
      get readyNotified() {
        return true;
      },
      get analyzerInitialized() {
        return analyzerInitialized;
      },
      get analyzerInitPromise() {
        return analyzerInitPromise;
      },
    };

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
    expect(initializePlugin).not.toHaveBeenCalled();

    resolveAnalyzerInit?.();
    await analyzerInitPromise;
    await Promise.resolve();
    await Promise.resolve();

    expect(initializePlugin).toHaveBeenCalledWith('plugin.test', '/test/workspace');
    expect(replayReadinessForPlugin).toHaveBeenCalledWith('plugin.test');
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
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
