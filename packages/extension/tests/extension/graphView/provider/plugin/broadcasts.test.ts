import * as vscode from 'vscode';
import { describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderPluginBroadcastMethods } from '../../../../../src/extension/graphView/provider/plugin/broadcasts';
import { createPluginSource } from './source';

describe('graphView/provider/plugin/broadcasts', () => {
  it('sends Extension plugin injections after refreshing resource roots', () => {
    const registerBuiltInPluginRoots = vi.fn();
    const refreshWebviewResourceRoots = vi.fn();
    const resolveWebviewAssetPath = vi.fn(() => 'asset://plugin.js');
    const sendPluginWebviewInjections = vi.fn(
      (_analyzer, resolveAssetPath, sendMessage) => {
        expect(resolveAssetPath('plugin.js', 'acme.plugin')).toBe('asset://plugin.js');
        sendMessage({
          type: 'PLUGIN_WEBVIEW_INJECT',
          payload: {
            pluginId: 'acme.plugin',
            scripts: ['asset://plugin.js'],
            styles: [],
          },
        });
      },
    );
    const source = createPluginSource({
      _registerBuiltInPluginRoots: registerBuiltInPluginRoots,
      _refreshWebviewResourceRoots: refreshWebviewResourceRoots,
      _resolveWebviewAssetPath: resolveWebviewAssetPath,
    });
    const methods = createGraphViewProviderPluginBroadcastMethods(
      source,
      { sendPluginWebviewInjections },
      1,
    );

    methods._sendPluginWebviewInjections();

    expect(registerBuiltInPluginRoots).toHaveBeenCalledOnce();
    expect(refreshWebviewResourceRoots).toHaveBeenCalledOnce();
    expect(source._sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'PLUGIN_WEBVIEW_INJECT',
    }));
    expect(refreshWebviewResourceRoots.mock.invocationCallOrder[0]).toBeLessThan(
      resolveWebviewAssetPath.mock.invocationCallOrder[0]!,
    );
  });

  it('passes the current workspace folder to group updates', () => {
    const workspaceFolder = { uri: vscode.Uri.file('/workspace') } as vscode.WorkspaceFolder;
    const sendGroupsUpdated = vi.fn((_groups, options) => {
      expect(options.workspaceFolder).toBe(workspaceFolder);
    });
    const methods = createGraphViewProviderPluginBroadcastMethods(
      createPluginSource(),
      {
        sendGroupsUpdated,
        getWorkspaceFolders: () => [workspaceFolder],
      },
      1,
    );

    methods._sendGroupsUpdated();

    expect(sendGroupsUpdated).toHaveBeenCalledOnce();
  });
});
