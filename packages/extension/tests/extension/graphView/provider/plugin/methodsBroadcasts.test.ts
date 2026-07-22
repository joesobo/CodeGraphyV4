import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
import type { IGroup } from '../../../../../src/shared/settings/groups';
import {
  createGraphViewProviderPluginMethods,
  type GraphViewProviderPluginMethodsSource,
} from '../../../../../src/extension/graphView/provider/plugin/methods';

const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

function createSource(
  overrides: Partial<GraphViewProviderPluginMethodsSource> = {},
): GraphViewProviderPluginMethodsSource {
  const source = {
    _pluginExtensionUris: new Map<string, vscode.Uri>(),
    _analyzer: {
      registry: {
        list: vi.fn(() => []),
        getPluginAPI: vi.fn(),
        register: vi.fn(),
        initializePlugin: vi.fn(async () => undefined),
        replayReadinessForPlugin: vi.fn(),
      },
      getPluginStatuses: vi.fn(() => []),
    },
    _disabledPlugins: new Set<string>(),
    _groups: [],
    _view: undefined,
    _panels: [],
    _viewRegistry: { getAvailableViews: vi.fn(() => []) } as never,
    _viewContext: { activePlugins: new Set(), depthLimit: 1 } as never,
    _depthMode: false,
    _graphData: EMPTY_GRAPH_DATA,
    _rawGraphData: EMPTY_GRAPH_DATA,
    _decorationManager: {
      getMergedNodeDecorations: vi.fn(() => new Map()),
      getMergedEdgeDecorations: vi.fn(() => new Map()),
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
    invalidatePluginFiles: vi.fn(() => []),
    refreshChangedFiles: vi.fn(async () => undefined),
    ...overrides,
  };

  source._graphData ??= EMPTY_GRAPH_DATA;

  return source as GraphViewProviderPluginMethodsSource;
}

describe('graphView/provider/plugin/methods', () => {
  it('forwards decoration payloads through the provider message bridge', () => {
    const sendMessage = vi.fn();
    const methods = createGraphViewProviderPluginMethods(
      createSource({ _sendMessage: sendMessage }),
      {
        sendDepthState: vi.fn(),
        sendPluginStatuses: vi.fn(),
        sendDecorations: vi.fn((_manager, callback) =>
          callback({ type: 'DECORATIONS_UPDATED', payload: { nodes: ['node'], edges: ['edge'] } }),
        ),
        sendContextMenuItems: vi.fn(),
        sendPluginWebviewInjections: vi.fn(),
        sendGroupsUpdated: vi.fn(),
        registerExternalPlugin: vi.fn(),
        getWorkspaceFolders: vi.fn(() => []),
      },
    );

    methods._sendDecorations();

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'DECORATIONS_UPDATED',
      payload: { nodes: ['node'], edges: ['edge'] },
    });
  });

  it('forwards context menu payloads through the provider message bridge', () => {
    const sendMessage = vi.fn();
    const methods = createGraphViewProviderPluginMethods(
      createSource({ _sendMessage: sendMessage }),
      {
        sendDepthState: vi.fn(),
        sendPluginStatuses: vi.fn(),
        sendDecorations: vi.fn(),
        sendContextMenuItems: vi.fn((_analyzer, callback) =>
          callback({ type: 'CONTEXT_MENU_ITEMS', payload: { items: [{ id: 'menu-item' }] } }),
        ),
        sendPluginWebviewInjections: vi.fn(),
        sendGroupsUpdated: vi.fn(),
        registerExternalPlugin: vi.fn(),
        getWorkspaceFolders: vi.fn(() => []),
      },
    );

    methods._sendContextMenuItems();

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'CONTEXT_MENU_ITEMS',
      payload: { items: [{ id: 'menu-item' }] },
    });
  });

  it('forwards view and plugin broadcasts', () => {
    const sendMessage = vi.fn();
    const source = createSource({
      _sendMessage: sendMessage,
      _groups: [{ id: 'user', pattern: '*.ts', color: '#fff' } as IGroup],
    });
    const methods = createGraphViewProviderPluginMethods(source, {
      sendDepthState: vi.fn((
        _context,
        _depthMode,
        _rawGraphData,
        _defaultDepthLimit,
        callback,
      ) =>
        callback({
          type: 'DEPTH_MODE_UPDATED',
          payload: { depthMode: false },
        }),
      ),
      sendPluginStatuses: vi.fn((_analyzer, _disabledPlugins, callback) =>
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
        callback({ type: 'LEGENDS_UPDATED', payload: { legends: [] } }),
      ),
      registerExternalPlugin: vi.fn(),
      getWorkspaceFolders: vi.fn(() => []),
    });

    methods._sendDepthState();
    methods._sendPluginStatuses();
    methods._sendDecorations();
    methods._sendContextMenuItems();
    methods._sendPluginWebviewInjections();
    methods._sendGroupsUpdated();

    expect(sendMessage).toHaveBeenCalledWith({
      type: 'DEPTH_MODE_UPDATED',
      payload: { depthMode: false },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGINS_UPDATED',
      payload: { plugins: [] },
    });
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'LEGENDS_UPDATED',
      payload: { legends: [] },
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
      sendDepthState: vi.fn(),
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
        callback({ type: 'LEGENDS_UPDATED', payload: { legends: [] } });
      }),
      registerExternalPlugin: vi.fn(),
      getWorkspaceFolders: vi.fn(() => []),
    });

    methods._sendPluginWebviewInjections();
    methods._sendGroupsUpdated();

    expect(resolveWebviewAssetPath).toHaveBeenCalledWith('icon.svg', 'plugin.test');
    expect(registerBuiltInPluginRoots).toHaveBeenCalledTimes(2);
  });

  it('passes the current workspace folder into group updates', () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const methods = createGraphViewProviderPluginMethods(createSource(), {
      sendDepthState: vi.fn(),
      sendPluginStatuses: vi.fn(),
      sendDecorations: vi.fn(),
      sendContextMenuItems: vi.fn(),
      sendPluginWebviewInjections: vi.fn(),
      sendGroupsUpdated: vi.fn((_groups, options) => {
        expect(options.workspaceFolder).toBe(workspaceFolder);
      }),
      registerExternalPlugin: vi.fn(),
      getWorkspaceFolders: vi.fn(() => [workspaceFolder]),
    });

    methods._sendGroupsUpdated();
  });

  it('omits the workspace folder from group updates when none exists', () => {
    const methods = createGraphViewProviderPluginMethods(createSource(), {
      sendDepthState: vi.fn(),
      sendPluginStatuses: vi.fn(),
      sendDecorations: vi.fn(),
      sendContextMenuItems: vi.fn(),
      sendPluginWebviewInjections: vi.fn(),
      sendGroupsUpdated: vi.fn((_groups, options) => {
        expect(options.workspaceFolder).toBeUndefined();
      }),
      registerExternalPlugin: vi.fn(),
      getWorkspaceFolders: vi.fn(() => undefined),
    });

    methods._sendGroupsUpdated();
  });

});
