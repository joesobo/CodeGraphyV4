import { describe, expect, it, vi } from 'vitest';
import { createTestAPI } from './testSupport';

describe('CodeGraphyAPIImpl webview messaging', () => {
  it('namespaces messages with the plugin ID', () => {
    const { api, webviewSender } = createTestAPI('my-plugin');

    api.sendToWebview({ type: 'highlight', data: { nodeId: 'a.ts' } });

    expect(webviewSender).toHaveBeenCalledWith({
      type: 'plugin:my-plugin:highlight',
      data: { nodeId: 'a.ts' },
    });
  });

  it('forwards webview payloads unchanged', () => {
    const { api, webviewSender } = createTestAPI('test-plugin');
    const data = { nested: { value: 42 } };

    api.sendToWebview({ type: 'custom', data });

    expect(webviewSender).toHaveBeenCalledWith({
      type: 'plugin:test-plugin:custom',
      data,
    });
  });

  it('registers, unregisters, and dispatches webview message handlers', () => {
    const { api } = createTestAPI();
    const handler = vi.fn();

    const disposable = api.onWebviewMessage(handler);
    api.deliverWebviewMessage({ type: 'click', data: { id: 'a.ts' } });

    expect(handler).toHaveBeenCalledWith({ type: 'click', data: { id: 'a.ts' } });

    disposable.dispose();
    api.deliverWebviewMessage({ type: 'click', data: {} });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not stop other webview handlers when one throws', () => {
    const { api } = createTestAPI();
    const firstHandler = vi.fn(() => { throw new Error('boom'); });
    const secondHandler = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    api.onWebviewMessage(firstHandler);
    api.onWebviewMessage(secondHandler);
    api.deliverWebviewMessage({ type: 'test', data: null });

    expect(firstHandler).toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error in webview message handler for plugin test-plugin:',
      expect.any(Error),
    );
  });
});
