import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../src/shared/graph/contracts';
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
  it('registers external plugins with live provider state and callbacks', () => {
    const registerExternalPlugin = vi.fn();
    const source = createSource();
    const methods = createGraphViewProviderPluginMethods(source, {
      sendDepthState: vi.fn(),
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
          sendDepthState: expect.any(Function),
          sendPluginStatuses: expect.any(Function),
          sendContextMenuItems: expect.any(Function),
          sendPluginToolbarActions: expect.any(Function),
          sendGraphViewContributionStatuses: expect.any(Function),
          sendPluginWebviewInjections: expect.any(Function),
          reprocessPluginFiles: expect.any(Function),
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
      sendDepthState: vi.fn(),
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
    const sendPluginToolbarActions = vi.fn();
    const sendGraphViewContributionStatuses = vi.fn();
    const sendPluginWebviewInjections = vi.fn();
    const sendDepthState = vi.fn();
    const invalidatePluginFiles = vi.fn(() => ['/workspace/src/index.ts']);
    const refreshChangedFiles = vi.fn(async () => undefined);
    const source = createSource({
      invalidatePluginFiles,
      refreshChangedFiles,
    });
    const methods = createGraphViewProviderPluginMethods(
      source,
      {
        sendDepthState,
        sendPluginStatuses,
        sendDecorations: vi.fn(),
        sendContextMenuItems,
        sendPluginToolbarActions,
        sendGraphViewContributionStatuses,
        sendPluginWebviewInjections,
        sendGroupsUpdated: vi.fn(),
        registerExternalPlugin,
        getWorkspaceFolders: vi.fn(() => []),
      },
    );

    methods.registerExternalPlugin({ id: 'plugin.test' });

    const registrationHandlers = registerExternalPlugin.mock.calls[0]?.[3] as {
      sendDepthState(): void;
      sendPluginStatuses(): void;
      sendContextMenuItems(): void;
      sendPluginToolbarActions(): void;
      sendGraphViewContributionStatuses(): void;
      sendPluginWebviewInjections(): void;
      reprocessPluginFiles(pluginIds: readonly string[]): Promise<void>;
    };

    registrationHandlers.sendDepthState();
    registrationHandlers.sendPluginStatuses();
    registrationHandlers.sendContextMenuItems();
    registrationHandlers.sendPluginToolbarActions();
    registrationHandlers.sendGraphViewContributionStatuses();
    registrationHandlers.sendPluginWebviewInjections();
    await registrationHandlers.reprocessPluginFiles(['plugin.test']);

    expect(sendDepthState).toHaveBeenCalledOnce();
    expect(sendPluginStatuses).toHaveBeenCalledOnce();
    expect(sendContextMenuItems).toHaveBeenCalledOnce();
    expect(sendPluginToolbarActions).toHaveBeenCalledOnce();
    expect(sendGraphViewContributionStatuses).toHaveBeenCalledOnce();
    expect(sendPluginWebviewInjections).toHaveBeenCalledOnce();
    expect(invalidatePluginFiles).toHaveBeenCalledWith(['plugin.test']);
    expect(refreshChangedFiles).toHaveBeenCalledWith(['/workspace/src/index.ts']);
    expect(source._analyzeAndSendData).not.toHaveBeenCalled();
  });
});
