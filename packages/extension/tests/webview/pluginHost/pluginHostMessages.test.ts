import { describe, it, expect, vi } from 'vitest';
import { deliverPluginMessage } from '../../../src/webview/pluginHost/pluginHostMessages';

describe('deliverPluginMessage', () => {
  it('delivers a message to all registered handlers for the plugin', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    const messageHandlers = new Map<string, Set<(msg: { type: string; data: unknown }) => void>>();
    messageHandlers.set('acme', new Set([handler1, handler2]));

    deliverPluginMessage('acme', { type: 'PING', data: { ok: true } }, messageHandlers);

    expect(handler1).toHaveBeenCalledWith({ type: 'PING', data: { ok: true } });
    expect(handler2).toHaveBeenCalledWith({ type: 'PING', data: { ok: true } });
  });

  it('does nothing when no handlers are registered for the plugin', () => {
    const messageHandlers = new Map<string, Set<(msg: { type: string; data: unknown }) => void>>();

    // Should not throw
    deliverPluginMessage('nonexistent', { type: 'PING', data: null }, messageHandlers);
  });

  it('catches errors from handlers and continues delivering to remaining handlers', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingHandler = vi.fn(() => { throw new Error('boom'); });
    const successHandler = vi.fn();
    const messageHandlers = new Map<string, Set<(msg: { type: string; data: unknown }) => void>>();
    messageHandlers.set('acme', new Set([failingHandler, successHandler]));

    deliverPluginMessage('acme', { type: 'EVENT', data: 'payload' }, messageHandlers);

    expect(failingHandler).toHaveBeenCalled();
    expect(successHandler).toHaveBeenCalledWith({ type: 'EVENT', data: 'payload' });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Plugin acme message handler error'), expect.any(Error));
    errorSpy.mockRestore();
  });

  it('does not deliver to handlers registered under a different plugin id', () => {
    const handler = vi.fn();
    const messageHandlers = new Map<string, Set<(msg: { type: string; data: unknown }) => void>>();
    messageHandlers.set('other', new Set([handler]));

    deliverPluginMessage('acme', { type: 'PING', data: null }, messageHandlers);

    expect(handler).not.toHaveBeenCalled();
  });
});
