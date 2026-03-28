import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMessageHandler, setupMessageListener } from '../../src/webview/appMessageListener';
import { graphStore } from '../../src/webview/store';
import type { WebviewPluginHost } from '../../src/webview/pluginHost/webviewPluginHost';

describe('createMessageHandler', () => {
  let injectPluginAssets: ReturnType<typeof vi.fn>;
  let pluginHost: { deliverMessage: ReturnType<typeof vi.fn> };
  let handler: (event: MessageEvent<unknown>) => void;

  beforeEach(() => {
    injectPluginAssets = vi.fn().mockResolvedValue(undefined);
    pluginHost = { deliverMessage: vi.fn() };
    handler = createMessageHandler(injectPluginAssets, pluginHost as unknown as WebviewPluginHost);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('ignores null message data', () => {
    const handleExtensionMessage = vi.spyOn(graphStore.getState(), 'handleExtensionMessage');

    handler(new MessageEvent('message', { data: null }));

    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('ignores non-object message data', () => {
    handler(new MessageEvent('message', { data: 42 }));

    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
  });

  it('ignores messages without a string type', () => {
    handler(new MessageEvent('message', { data: { type: 123 } }));

    expect(injectPluginAssets).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
  });

  it('calls injectPluginAssets for PLUGIN_WEBVIEW_INJECT messages with valid payload', () => {
    handler(new MessageEvent('message', {
      data: {
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'test-plugin',
          scripts: ['a.js'],
          styles: ['a.css'],
        },
      },
    }));

    expect(injectPluginAssets).toHaveBeenCalledWith({
      pluginId: 'test-plugin',
      scripts: ['a.js'],
      styles: ['a.css'],
    });
  });

  it('does not call injectPluginAssets for PLUGIN_WEBVIEW_INJECT with invalid payload', () => {
    handler(new MessageEvent('message', {
      data: {
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: { pluginId: 42 },
      },
    }));

    expect(injectPluginAssets).not.toHaveBeenCalled();
  });

  it('returns early after handling PLUGIN_WEBVIEW_INJECT without falling through', () => {
    const handleExtensionMessage = vi.spyOn(graphStore.getState(), 'handleExtensionMessage');

    handler(new MessageEvent('message', {
      data: {
        type: 'PLUGIN_WEBVIEW_INJECT',
        payload: {
          pluginId: 'test-plugin',
          scripts: [],
          styles: [],
        },
      },
    }));

    expect(handleExtensionMessage).not.toHaveBeenCalled();
    expect(pluginHost.deliverMessage).not.toHaveBeenCalled();
  });

  it('delivers scoped plugin messages to the plugin host', () => {
    handler(new MessageEvent('message', {
      data: {
        type: 'plugin:acme:node:click',
        data: { nodeId: 'src/App.ts' },
      },
    }));

    expect(pluginHost.deliverMessage).toHaveBeenCalledWith('acme', { type: 'node:click', data: { nodeId: 'src/App.ts' } });
  });

  it('returns early after handling a scoped plugin message without falling through', () => {
    const handleExtensionMessage = vi.spyOn(graphStore.getState(), 'handleExtensionMessage');

    handler(new MessageEvent('message', {
      data: {
        type: 'plugin:acme:event',
        data: null,
      },
    }));

    expect(handleExtensionMessage).not.toHaveBeenCalled();
  });

  it('forwards unrecognized messages to the store handleExtensionMessage', () => {
    const handleExtensionMessage = vi.spyOn(graphStore.getState(), 'handleExtensionMessage');

    handler(new MessageEvent('message', {
      data: {
        type: 'GRAPH_DATA_UPDATED',
        payload: { nodes: [], edges: [] },
      },
    }));

    expect(handleExtensionMessage).toHaveBeenCalledWith({
      type: 'GRAPH_DATA_UPDATED',
      payload: { nodes: [], edges: [] },
    });
  });
});

describe('setupMessageListener', () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventSpy = vi.spyOn(window, 'addEventListener');
    removeEventSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('adds a message listener and sends WEBVIEW_READY', () => {
    const injectPluginAssets = vi.fn().mockResolvedValue(undefined);
    const pluginHost = { deliverMessage: vi.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages = (globalThis as any).__vscodeSentMessages as Array<{ type?: string }>;
    const sentBefore = sentMessages.length;

    setupMessageListener(injectPluginAssets, pluginHost as unknown as WebviewPluginHost);

    expect(addEventSpy).toHaveBeenCalledWith('message', expect.any(Function));

    const readyMessages = sentMessages.slice(sentBefore).filter((msg) => msg.type === 'WEBVIEW_READY');
    expect(readyMessages).toHaveLength(1);
  });

  it('returns a cleanup function that removes the listener', () => {
    const injectPluginAssets = vi.fn().mockResolvedValue(undefined);
    const pluginHost = { deliverMessage: vi.fn() };

    const cleanup = setupMessageListener(injectPluginAssets, pluginHost as unknown as WebviewPluginHost);
    cleanup();

    expect(removeEventSpy).toHaveBeenCalledWith('message', expect.any(Function));
  });
});
