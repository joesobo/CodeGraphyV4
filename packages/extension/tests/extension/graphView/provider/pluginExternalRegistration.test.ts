import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';
import { createGraphViewProviderExternalPluginRegistration } from '../../../../src/extension/graphView/provider/pluginExternalRegistration';
import type { GraphViewProviderPluginBroadcastMethods } from '../../../../src/extension/graphView/provider/pluginBroadcasts';
import { createPluginSource } from './pluginSource';

function createBroadcasts(): GraphViewProviderPluginBroadcastMethods {
  return {
    _sendDepthState: vi.fn(),
    _sendGraphControls: vi.fn(),
    _sendPluginStatuses: vi.fn(),
    _sendDecorations: vi.fn(),
    _sendContextMenuItems: vi.fn(),
    _sendPluginExporters: vi.fn(),
    _sendPluginToolbarActions: vi.fn(),
    _sendPluginWebviewInjections: vi.fn(),
    _sendGroupsUpdated: vi.fn(),
  };
}

describe('graphView/provider/pluginExternalRegistration', () => {
  it('registers external plugins with live provider state and callbacks', () => {
    const registerExternalPlugin = vi.fn();
    const source = createPluginSource();
    const broadcasts = createBroadcasts();
    const register = createGraphViewProviderExternalPluginRegistration(
      source,
      {
        registerExternalPlugin,
        getWorkspaceFolders: vi.fn(() => [{ uri: vscode.Uri.file('/workspace') }] as never),
      },
      broadcasts,
    );

    register({ id: 'plugin.test' }, { extensionUri: '/plugin' });

    const [registeredPlugin, registrationOptions, initialState, handlers] =
      registerExternalPlugin.mock.calls[0] ?? [];
    expect(registeredPlugin).toEqual({ id: 'plugin.test' });
    expect(registrationOptions).toEqual({ extensionUri: '/plugin' });
    expect(initialState).toEqual(
      expect.objectContaining({
        analyzer: source._analyzer,
        pluginExtensionUris: source._pluginExtensionUris,
      }),
    );
    expect(handlers).toEqual(
      expect.objectContaining({
        normalizeExtensionUri: expect.any(Function),
        getWorkspaceRoot: expect.any(Function),
        refreshWebviewResourceRoots: expect.any(Function),
        sendDepthState: expect.any(Function),
        sendPluginStatuses: expect.any(Function),
        sendContextMenuItems: expect.any(Function),
        sendPluginToolbarActions: expect.any(Function),
        sendPluginWebviewInjections: expect.any(Function),
        invalidateTimelineCache: expect.any(Function),
        analyzeAndSendData: expect.any(Function),
      }),
    );

    source._firstAnalysis = false;
    source._webviewReadyNotified = true;
    source._analyzerInitialized = false;
    source._analyzerInitPromise = Promise.resolve();

    expect(initialState.firstAnalysis).toBe(false);
    expect(initialState.readyNotified).toBe(true);
    expect(initialState.analyzerInitialized).toBe(false);
    expect(initialState.analyzerInitPromise).toBeInstanceOf(Promise);
  });

  it('reads the workspace root lazily from the current folders', () => {
    const registerExternalPlugin = vi.fn();
    const workspaceState = {
      folders: undefined as vscode.WorkspaceFolder[] | undefined,
    };
    const register = createGraphViewProviderExternalPluginRegistration(
      createPluginSource(),
      {
        registerExternalPlugin,
        getWorkspaceFolders: vi.fn(() => workspaceState.folders),
      },
      createBroadcasts(),
    );

    register({ id: 'plugin.test' });

    const handlers = registerExternalPlugin.mock.calls[0]?.[3] as { getWorkspaceRoot(): string | undefined };
    expect(handlers.getWorkspaceRoot()).toBeUndefined();

    workspaceState.folders = [{ uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder];
    expect(handlers.getWorkspaceRoot()).toBe('/workspace');
  });
});
