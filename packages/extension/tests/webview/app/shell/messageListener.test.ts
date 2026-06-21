import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphStore } from '../../../../src/webview/store/state';
import { createMessageHandler, setupMessageListener, type InjectAssetsParams } from '../../../../src/webview/app/shell/messageListener';
import type { WebviewPluginHost } from '../../../../src/webview/pluginHost/manager';

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: vi.fn(),
}));

import { postMessage } from '../../../../src/webview/vscodeApi';

describe('app message listener', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete (window as Window & { __codegraphyWebviewReadyPosted?: boolean })
      .__codegraphyWebviewReadyPosted;
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
    const beginPluginAssetLoad = vi.fn();
    const finishPluginAssetLoad = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      beginPluginAssetLoad,
      finishPluginAssetLoad,
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
    await Promise.resolve();

    expect(beginPluginAssetLoad).toHaveBeenCalledOnce();
    expect(injectPluginAssets).toHaveBeenCalledWith({
      pluginId: 'codegraphy.typescript',
      scripts: ['one.js', 'two.js'],
      styles: ['one.css', 'two.css'],
      assets: [],
    });
    expect(finishPluginAssetLoad).toHaveBeenCalledOnce();
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

  it('replaces css snippet stylesheets and stores the toggle map without forwarding to the graph store', () => {
    document.head.innerHTML = '';
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    const setCssSnippets = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
      setCssSnippets,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost);

    handler({
      data: {
        type: 'CSS_SNIPPETS_UPDATED',
        payload: {
          snippets: {
            '.codegraphy/snippets/base.css': true,
            '.codegraphy/snippets/ocean.css': false,
            invalid: 'yes',
          },
          stylesheets: ['webview://base.css', 123, 'webview://override.css'],
        },
      },
    } as MessageEvent<unknown>);

    expect(Array.from(
      document.head.querySelectorAll('link[data-codegraphy-css-snippet="true"]'),
    ).map(link => (link as HTMLLinkElement).href)).toEqual([
      'webview://base.css',
      'webview://override.css',
    ]);
    expect(setCssSnippets).toHaveBeenCalledWith({
      '.codegraphy/snippets/base.css': true,
      '.codegraphy/snippets/ocean.css': false,
    });
    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('removes disabled plugin registrations before forwarding plugin status updates', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = {
      deliverMessage: vi.fn(),
      removePlugin: vi.fn(),
    } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost);
    const message = {
      type: 'PLUGINS_UPDATED',
      payload: {
        plugins: [
          { id: 'acme.graph-tools', enabled: false },
          { id: 'codegraphy.markdown', enabled: true },
        ],
      },
    };

    handler({ data: message } as MessageEvent<unknown>);

    expect(pluginHost.removePlugin).toHaveBeenCalledWith('acme.graph-tools');
    expect(pluginHost.removePlugin).not.toHaveBeenCalledWith('codegraphy.markdown');
    expect(handleExtensionMessage).toHaveBeenCalledWith(message);
  });

  it('removes a package plugin by its last runtime plugin id when package status becomes unavailable', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const resetPluginAssets = vi.fn();
    const pluginHost = {
      deliverMessage: vi.fn(),
      removePlugin: vi.fn(),
    } as unknown as WebviewPluginHost;
    const handleExtensionMessage = vi.fn();
    vi.spyOn(graphStore, 'getState').mockReturnValue({
      handleExtensionMessage,
    } as unknown as ReturnType<typeof graphStore.getState>);

    const handler = createMessageHandler(injectPluginAssets, pluginHost, resetPluginAssets);
    handler({
      data: {
        type: 'PLUGINS_UPDATED',
        payload: {
          plugins: [
            { id: 'acme.graph-tools', packageName: '@acme/graph-tools', enabled: true },
          ],
        },
      },
    } as MessageEvent<unknown>);
    handler({
      data: {
        type: 'PLUGINS_UPDATED',
        payload: {
          plugins: [
            { id: '@acme/graph-tools', packageName: '@acme/graph-tools', enabled: false },
          ],
        },
      },
    } as MessageEvent<unknown>);

    expect(pluginHost.removePlugin).toHaveBeenCalledWith('acme.graph-tools');
    expect(resetPluginAssets).toHaveBeenCalledWith('acme.graph-tools');
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
    const beginInitialBootstrap = vi.spyOn(graphStore.getState(), 'beginInitialBootstrap');

    const cleanup = setupMessageListener(injectPluginAssets, pluginHost);

    expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
    expect(beginInitialBootstrap).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledWith({ type: 'WEBVIEW_READY', payload: null });

    const registeredHandler = addEventListenerSpy.mock.calls[0]?.[1];
    cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('message', registeredHandler);
  });

  it('posts WEBVIEW_READY only once when the listener is set up twice in the same page lifecycle', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;

    const firstCleanup = setupMessageListener(injectPluginAssets, pluginHost);
    const secondCleanup = setupMessageListener(injectPluginAssets, pluginHost);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: 'WEBVIEW_READY', payload: null });

    firstCleanup();
    secondCleanup();
  });

  it('posts WEBVIEW_READY again after the previous listener is cleaned up', () => {
    const injectPluginAssets = vi.fn<(_params: InjectAssetsParams) => Promise<void>>().mockResolvedValue();
    const pluginHost = { deliverMessage: vi.fn() } as unknown as WebviewPluginHost;

    const firstCleanup = setupMessageListener(injectPluginAssets, pluginHost);
    firstCleanup();
    const secondCleanup = setupMessageListener(injectPluginAssets, pluginHost);

    expect(postMessage).toHaveBeenCalledTimes(2);
    expect(postMessage).toHaveBeenNthCalledWith(1, { type: 'WEBVIEW_READY', payload: null });
    expect(postMessage).toHaveBeenNthCalledWith(2, { type: 'WEBVIEW_READY', payload: null });

    secondCleanup();
  });
});
