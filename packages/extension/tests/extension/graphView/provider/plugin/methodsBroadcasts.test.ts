import { describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderPluginMethods } from '../../../../../src/extension/graphView/provider/plugin/methods';
import { createPluginSource } from './source';

describe('graphView/provider/plugin/methods', () => {
  it('forwards Extension plugin webview injections through the provider bridge', () => {
    const source = createPluginSource();
    const methods = createGraphViewProviderPluginMethods(source, {
      sendPluginWebviewInjections: vi.fn((_analyzer, _resolveAssetPath, sendMessage) => {
        sendMessage({
          type: 'PLUGIN_WEBVIEW_INJECT',
          payload: {
            pluginId: 'acme.plugin',
            scripts: ['asset://plugin.js'],
            styles: [],
          },
        });
      }),
    });

    methods._sendPluginWebviewInjections();

    expect(source._sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'PLUGIN_WEBVIEW_INJECT',
    }));
  });
});
