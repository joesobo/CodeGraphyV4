import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { IGroup } from '../../../src/shared/types';
import {
  createGraphViewProviderPluginMethods,
  type GraphViewProviderPluginMethodsSource,
} from '../../../src/extension/graphView/providerPluginMethods';

function createSource(
  overrides: Partial<GraphViewProviderPluginMethodsSource> = {},
): GraphViewProviderPluginMethodsSource {
  return {
    _pluginExtensionUris: new Map<string, vscode.Uri>(),
    _analyzer: {
      registry: {
        list: vi.fn(() => []),
        getPluginAPI: vi.fn(),
      },
      getPluginStatuses: vi.fn(() => []),
    },
    _disabledPlugins: new Set<string>(),
    _disabledRules: new Set<string>(),
    _groups: [],
    _view: undefined,
    _panels: [],
    _viewRegistry: { getAvailableViews: vi.fn(() => []) } as never,
    _viewContext: { activePlugins: new Set(), depthLimit: 1 } as never,
    _activeViewId: 'codegraphy.connections',
    _decorationManager: {
      getMergedNodeDecorations: vi.fn(() => []),
      getMergedEdgeDecorations: vi.fn(() => []),
    },
    _firstAnalysis: true,
    _webviewReadyNotified: false,
    _analyzerInitialized: true,
    _analyzerInitPromise: undefined,
    _registerBuiltInPluginRoots: vi.fn(),
    _resolveWebviewAssetPath: vi.fn(() => 'asset://icon.svg'),
    _refreshWebviewResourceRoots: vi.fn(),
    _normalizeExternalExtensionUri: vi.fn(uri =>
      typeof uri === 'string' ? vscode.Uri.file(uri) : uri,
    ),
    _sendMessage: vi.fn(),
    _analyzeAndSendData: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('graphView/providerPluginMethods', () => {
  it('forwards view and plugin broadcasts', () => {
    const sendMessage = vi.fn();
    const source = createSource({
      _sendMessage: sendMessage,
      _groups: [{ id: 'user', pattern: '*.ts', color: '#fff' } as IGroup],
    });
    const methods = createGraphViewProviderPluginMethods(source, {
      sendAvailableViews: vi.fn((_registry, _context, _activeViewId, _defaultDepthLimit, callback) =>
        callback({ type: 'VIEWS_UPDATED', payload: { views: [], activeViewId: 'codegraphy.connections' } }),
      ),
      sendPluginStatuses: vi.fn((_analyzer, _disabledRules, _disabledPlugins, callback) =>
        callback({ type: 'PLUGINS_UPDATED', payload: { plugins: [] } }),
      ),
      sendDecorations: vi.fn((_manager, callback) =>
        callback({ type: 'DECORATIONS_UPDATED', payload: { nodes: [], edges: [] } }),
      ),
      sendContextMenuItems: vi.fn((_analyzer, callback) =>
        callback({ type: 'CONTEXT_MENU_ITEMS', payload: { items: [] } }),
      ),
      sendPluginWebviewInjections: vi.fn((_analyzer, _resolveAssetPath, callback) =>
        callback({ type: 'PLUGIN_WEBVIEW_INJECT', payload: { kind: 'script', src: 'asset://script.js' } }),
      ),
      sendGroupsUpdated: vi.fn((_groups, _options, callback) =>
        callback({ type: 'GROUPS_UPDATED', payload: { groups: [] } }),
      ),
      registerExternalPlugin: vi.fn(),
      getWorkspaceFolders: vi.fn(() => []),
    });

    methods._sendAvailableViews();
    methods._sendPluginStatuses();
    methods._sendDecorations();
    methods._sendContextMenuItems();
    methods._sendPluginWebviewInjections();
    methods._sendGroupsUpdated();

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'VIEWS_UPDATED',
      payload: { views: [], activeViewId: 'codegraphy.connections' },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [] },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'GROUPS_UPDATED',
      payload: { groups: [] },
    });
  });

  it('uses provider-owned resource helpers for plugin webview injections and group updates', () => {
    const resolveWebviewAssetPath = vi.fn(() => 'asset://icon.svg');
    const registerBuiltInPluginRoots = vi.fn();
    const source = createSource({
      _resolveWebviewAssetPath: resolveWebviewAssetPath,
      _registerBuiltInPluginRoots: registerBuiltInPluginRoots,
    });
    const methods = createGraphViewProviderPluginMethods(source, {
      sendAvailableViews: vi.fn(),
      sendPluginStatuses: vi.fn(),
      sendDecorations: vi.fn(),
      sendContextMenuItems: vi.fn(),
      sendPluginWebviewInjections: vi.fn((analyzer, resolveAssetPath, callback) => {
        expect(analyzer).toBe(source._analyzer);
        expect(resolveAssetPath('icon.svg', 'plugin.test')).toBe('asset://icon.svg');
        callback({ type: 'PLUGIN_WEBVIEW_INJECT', payload: { kind: 'script', src: 'asset://script.js' } });
      }),
      sendGroupsUpdated: vi.fn((groups, options, callback) => {
        expect(groups).toBe(source._groups);
        options.registerPluginRoots();
        expect(options.view).toBe(source._view);
        expect(options.panels).toBe(source._panels);
        expect(options.resolvePluginAssetPath('icon.svg', 'plugin.test')).toBe('asset://icon.svg');
        callback({ type: 'GROUPS_UPDATED', payload: { groups: [] } });
      }),
      registerExternalPlugin: vi.fn(),
      getWorkspaceFolders: vi.fn(() => []),
    });

    methods._sendPluginWebviewInjections();
    methods._sendGroupsUpdated();

    expect(resolveWebviewAssetPath).toHaveBeenCalledWith('icon.svg', 'plugin.test');
    expect(registerBuiltInPluginRoots).toHaveBeenCalledOnce();
  });

  it('registers external plugins with the current provider state and callbacks', () => {
    const registerExternalPlugin = vi.fn();
    const source = createSource();
    const methods = createGraphViewProviderPluginMethods(source, {
      sendAvailableViews: vi.fn(),
      sendPluginStatuses: vi.fn(),
      sendDecorations: vi.fn(),
      sendContextMenuItems: vi.fn(),
      sendPluginWebviewInjections: vi.fn(),
      sendGroupsUpdated: vi.fn(),
      registerExternalPlugin,
      getWorkspaceFolders: vi.fn(() => [{ uri: vscode.Uri.file('/workspace') }] as never),
    });

    methods.registerExternalPlugin({ id: 'plugin.test' }, { extensionUri: '/plugin' });

    expect(registerExternalPlugin).toHaveBeenCalledWith(
      { id: 'plugin.test' },
      { extensionUri: '/plugin' },
      expect.objectContaining({
        analyzer: source._analyzer,
        pluginExtensionUris: source._pluginExtensionUris,
        firstAnalysis: true,
        webviewReadyNotified: false,
      }),
      expect.objectContaining({
        normalizeExtensionUri: expect.any(Function),
        getWorkspaceRoot: expect.any(Function),
        refreshWebviewResourceRoots: expect.any(Function),
        sendPluginStatuses: expect.any(Function),
        sendContextMenuItems: expect.any(Function),
        sendPluginWebviewInjections: expect.any(Function),
        analyzeAndSendData: expect.any(Function),
      }),
    );
  });
});
