import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphStore } from '../../../src/webview/store/state';
import { createMessageHandler, setupMessageListener, type InjectAssetsParams } from '../../../src/webview/app/messageListener';
import type { WebviewPluginHost } from '../../../src/webview/pluginHost/manager';

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../src/webview/vscodeApi';

describe('app message listener', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores invalid window messages', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost);

    handler({ data: null } as MessageEvent<unknown>);
    handler({ data: 123 } as MessageEvent<unknown>);
    handler({ data: { type: 123 } } as MessageEvent<unknown>);

    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('injects normalized plugin assets from PLUGIN_WEBVIEW_INJECT messages', async () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost);

    handler({
      data: {
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'codegraphy.typescript',
          scripts: ['one.js', 42, 'two.js'],
          styles: ['one.css', null, 'two.css'],
        },
      },
    } as MessageEvent<unknown>);

    await Promise.resolve();

    expect(injectPluginAssets).toHaveBeenCalledWith({
      pluginId: 'codegraphy.typescript',
      scripts: ['one.js', 'two.js'],
      styles: ['one.css', 'two.css'],
    });
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('ignores invalid plugin inject payloads', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost);

    handler({
      data: {
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: { scripts: ['one.js'], styles: ['one.css'] },
      },
    } as MessageEvent<unknown>);

    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('routes plugin-scoped messages to the plugin host', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost);

    handler({
      data: {
        type: 'plugin:codegraphy.typescript:ready',
        data: { enabled: true },
      },
    } as MessageEvent<unknown>);

    expect(pluginHost.deliverMessage).toHaveBeenCalledWith('codegraphy.typescript', {
      type: 'ready',
      data: { enabled: true },
    });
    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('forwards non-plugin messages to the graph store handler', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost);
    const message = { type: 'GRAPH_DATA_UPDATED', payload: { nodes: [], edges: [] } };

    handler({ data: message } as MessageEvent<unknown>);

    expect(handleExtensionMessage).toHaveBeenCalledWith(message);
    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
  });

  it('registers the window listener and posts WEBVIEW_READY', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const cleanup = setupMessageListener(injectPluginAssets, pluginHost);

    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    expect(postMessage).toHaveBeenCalledWith({ type: 'WEBVIEW_READY', payload: null });

    const registeredHandler = addEventListenerSpy.mock.calls[0]?.[1];
    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', registeredHandler);
  });
});
