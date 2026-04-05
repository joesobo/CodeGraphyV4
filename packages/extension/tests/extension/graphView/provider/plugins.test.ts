import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/types';
import type { IGroup } from '../../../../src/shared/settings/groups';
import {
  createGraphViewProviderPluginMethods,
  type GraphViewProviderPluginMethodsSource,
} from '../../../../src/extension/graphView/provider/plugins';

const EMPTY_GRAPH_DATA: IGraphData = { nodes: [], edges: [] };

function createSource(
  overrides: Partial<GraphViewProviderPluginMethodsSource> = {},
): GraphViewProviderPluginMethodsSource {
  return {
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
    _disabledRules: new Set<string>(),
    _groups: [],
    _view: undefined,
    _panels: [],
    _viewRegistry: { getAvailableViews: vi.fn(() => []) } as never,
    _viewContext: { activePlugins: new Set(), depthLimit: 1 } as never,
    _activeViewId: 'codegraphy.connections',
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
    _invalidateTimelineCache: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe('graphView/provider/plugins', () => {
  it('forwards decoration payloads through the provider message bridge', () => {
    const sendMessage = vi.fn();
    const methods = createGraphViewProviderPluginMethods(
      createSource({ _sendMessage: sendMessage }),
      {
        sendAvailableViews: vi.fn(),
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
        sendAvailableViews: vi.fn(),
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
      sendAvailableViews: vi.fn((
        _registry,
        _context,
        _activeViewId,
        _rawGraphData,
        _defaultDepthLimit,
        callback,
      ) =>
        callback({
          type: 'VIEWS_UPDATED',
          payload: { views: [], activeViewId: 'codegraphy.connections' },
        }),
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

  it('passes the current workspace folder into group updates', () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const methods = createGraphViewProviderPluginMethods(createSource(), {
      sendAvailableViews: vi.fn(),
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
      sendAvailableViews: vi.fn(),
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

  it('registers external plugins with live provider state and callbacks', () => {
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

    const [registeredPlugin, registrationOptions, initialRegistrationState, registrationHandlers] =
      registerExternalPlugin.mock.calls[0] ?? [];
    expect(registeredPlugin).toEqual({ id: 'plugin.test' });
    expect(registrationOptions).toEqual({ extensionUri: '/plugin' });
    expect(initialRegistrationState).toEqual(
      expect.objectContaining({
        analyzer: source._analyzer,
        pluginExtensionUris: source._pluginExtensionUris,
      }),
    );
      expect(registrationHandlers).toEqual(
        expect.objectContaining({
          normalizeExtensionUri: expect.any(Function),
          getWorkspaceRoot: expect.any(Function),
          refreshWebviewResourceRoots: expect.any(Function),
          sendPluginStatuses: expect.any(Function),
          sendContextMenuItems: expect.any(Function),
          sendPluginWebviewInjections: expect.any(Function),
          invalidateTimelineCache: expect.any(Function),
          analyzeAndSendData: expect.any(Function),
        }),
      );

    const capturedRegistrationState = registerExternalPlugin.mock.calls[0]?.[2] as {
      firstAnalysis: boolean;
      readyNotified: boolean;
      analyzerInitialized: boolean;
      analyzerInitPromise: Promise<void> | undefined;
    };
    source._firstAnalysis = false;
    source._webviewReadyNotified = true;
    source._analyzerInitialized = false;
    source._analyzerInitPromise = Promise.resolve();

    expect(capturedRegistrationState.firstAnalysis).toBe(false);
    expect(capturedRegistrationState.readyNotified).toBe(true);
    expect(capturedRegistrationState.analyzerInitialized).toBe(false);
    expect(capturedRegistrationState.analyzerInitPromise).toBeInstanceOf(Promise);
  });

  it('exposes a live workspace root through the external plugin registration handlers', () => {
    const registerExternalPlugin = vi.fn();
    let workspaceFolders: vscode.WorkspaceFolder[] | undefined = undefined;
    const methods = createGraphViewProviderPluginMethods(createSource(), {
      sendAvailableViews: vi.fn(),
      sendPluginStatuses: vi.fn(),
      sendDecorations: vi.fn(),
      sendContextMenuItems: vi.fn(),
      sendPluginWebviewInjections: vi.fn(),
      sendGroupsUpdated: vi.fn(),
      registerExternalPlugin,
      getWorkspaceFolders: vi.fn(() => workspaceFolders),
    });

    methods.registerExternalPlugin({ id: 'plugin.test' });

    const registrationHandlers = registerExternalPlugin.mock.calls[0]?.[3] as {
      getWorkspaceRoot(): string | undefined;
    };

    expect(registrationHandlers.getWorkspaceRoot()).toBeUndefined();

    workspaceFolders = [{ uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder];

    expect(registrationHandlers.getWorkspaceRoot()).toBe('/workspace');
  });

  it('forwards external plugin registration callbacks to the current provider methods', async () => {
    const registerExternalPlugin = vi.fn();
    const sendPluginStatuses = vi.fn();
    const sendContextMenuItems = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const analyzeAndSendData = vi.fn(async () => undefined);
    const invalidateTimelineCache = vi.fn(async () => undefined);
    const source = createSource({
      _analyzeAndSendData: analyzeAndSendData,
      _invalidateTimelineCache: invalidateTimelineCache,
    });
    const methods = createGraphViewProviderPluginMethods(
      source,
      {
        sendAvailableViews: vi.fn(),
        sendPluginStatuses,
        sendDecorations: vi.fn(),
        sendContextMenuItems,
        sendPluginWebviewInjections,
        sendGroupsUpdated: vi.fn(),
        registerExternalPlugin,
        getWorkspaceFolders: vi.fn(() => []),
      },
    );

    methods.registerExternalPlugin({ id: 'plugin.test' });

    const registrationHandlers = registerExternalPlugin.mock.calls[0]?.[3] as {
      sendPluginStatuses(): void;
      sendContextMenuItems(): void;
      sendPluginWebviewInjections(): void;
      invalidateTimelineCache(): Promise<void>;
      analyzeAndSendData(): Promise<void>;
    };

    registrationHandlers.sendPluginStatuses();
    registrationHandlers.sendContextMenuItems();
    registrationHandlers.sendPluginWebviewInjections();
    await registrationHandlers.invalidateTimelineCache();
    await registrationHandlers.analyzeAndSendData();

    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendContextMenuItems).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(source._invalidateTimelineCache).toHaveBeenCalledOnce();
    expect(analyzeAndSendData).toHaveBeenCalledOnce();
  });
});
