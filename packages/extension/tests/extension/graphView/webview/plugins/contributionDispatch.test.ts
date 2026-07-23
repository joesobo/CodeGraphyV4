import { describe, expect, it, vi } from 'vitest';

import { sendGraphViewPluginWebviewInjections } from '../../../../../src/extension/graphView/webview/plugins/contributionDispatch';

describe('graphView/webview/plugins/contributionDispatch', () => {
  it('injects assets only for active and enabled Extension plugins', () => {
    const sendMessage = vi.fn();
    const resolveAssetPath = vi.fn(
      (assetPath: string, pluginId?: string) => `${pluginId}:${assetPath}`,
    );
    const analyzer = {
      registry: {
        extensionPlugins: {
          listActive: () => [
            {
              plugin: {
                id: 'plugin.disabled',
                webviewContributions: { scripts: ['disabled.js'] },
              },
            },
            {
              descriptorSignature: 'build-v2',
              plugin: {
                id: 'plugin.enabled',
                webviewContributions: { scripts: ['enabled.js'] },
              },
            },
          ],
        },
      },
    };

    sendGraphViewPluginWebviewInjections(
      analyzer,
      resolveAssetPath,
      sendMessage,
      new Set(['plugin.disabled']),
    );

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith({
      type: 'PLUGIN_WEBVIEW_INJECT',
      payload: {
        pluginId: 'plugin.enabled',
        revision: 'build-v2',
        scripts: ['plugin.enabled:enabled.js?codegraphyPluginRevision=build-v2'],
        styles: [],
        assets: [],
      },
    });
    expect(resolveAssetPath).not.toHaveBeenCalledWith('disabled.js', 'plugin.disabled');
  });

  it('does nothing when the Extension analyzer is unavailable', () => {
    const sendMessage = vi.fn();
    const resolveAssetPath = vi.fn();

    sendGraphViewPluginWebviewInjections(undefined, resolveAssetPath, sendMessage);

    expect(resolveAssetPath).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
