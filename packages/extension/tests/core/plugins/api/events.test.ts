import { describe, expect, it, vi } from 'vitest';
import { createTestAPI } from './testSupport';

describe('CodeGraphyAPIImpl events', () => {
  it('registers and triggers handlers through emit', () => {
    const { api, eventBus } = createTestAPI();
    const handler = vi.fn();

    api.on('analysis:started', handler);
    eventBus.emit('analysis:started', { fileCount: 5 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ fileCount: 5 });
  });

  it('returns a disposable that unsubscribes handlers', () => {
    const { api, eventBus } = createTestAPI();
    const handler = vi.fn();

    const disposable = api.on('analysis:started', handler);
    disposable.dispose();
    eventBus.emit('analysis:started', { fileCount: 5 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('fires once handlers only once', () => {
    const { api, eventBus } = createTestAPI();
    const handler = vi.fn();

    api.once('analysis:started', handler);
    eventBus.emit('analysis:started', { fileCount: 1 });
    eventBus.emit('analysis:started', { fileCount: 2 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ fileCount: 1 });
  });

  it('returns a disposable that cancels once handlers before fire', () => {
    const { api, eventBus } = createTestAPI();
    const handler = vi.fn();

    const disposable = api.once('analysis:started', handler);
    disposable.dispose();
    eventBus.emit('analysis:started', { fileCount: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('removes a specific handler with off', () => {
    const { api, eventBus } = createTestAPI();
    const handler = vi.fn();

    api.on('analysis:started', handler);
    api.off('analysis:started', handler);
    eventBus.emit('analysis:started', { fileCount: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('scopes handlers to the plugin for auto-cleanup', () => {
    const { api, eventBus } = createTestAPI('my-plugin');
    const handler = vi.fn();

    api.on('analysis:started', handler);
    eventBus.removeAllForPlugin('my-plugin');
    eventBus.emit('analysis:started', { fileCount: 1 });

    expect(handler).not.toHaveBeenCalled();
  });
});
