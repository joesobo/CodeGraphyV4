import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../../src/core/plugins/eventBus';

describe('EventBus', () => {
  it('calls handler when event is emitted', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('graph:nodeClick', handler);

    const payload = { node: { id: 'a.ts', label: 'a.ts' }, event: { x: 0, y: 0 } };
    bus.emit('graph:nodeClick', payload);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(payload);
  });

  it('supports multiple handlers for the same event', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('analysis:started', h1);
    bus.on('analysis:started', h2);

    bus.emit('analysis:started', { fileCount: 10 });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('does not call handlers for different events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('graph:nodeClick', handler);

    bus.emit('analysis:started', { fileCount: 10 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('dispose() unsubscribes the handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const disposable = bus.on('graph:nodeClick', handler);

    disposable.dispose();
    bus.emit('graph:nodeClick', { node: { id: 'a', label: 'a' }, event: { x: 0, y: 0 } });

    expect(handler).not.toHaveBeenCalled();
  });

  it('off() removes a specific handler', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('graph:nodeClick', handler);

    bus.off('graph:nodeClick', handler);
    bus.emit('graph:nodeClick', { node: { id: 'a', label: 'a' }, event: { x: 0, y: 0 } });

    expect(handler).not.toHaveBeenCalled();
  });

  it('once() fires handler only once', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.once('analysis:started', handler);

    bus.emit('analysis:started', { fileCount: 5 });
    bus.emit('analysis:started', { fileCount: 10 });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({ fileCount: 5 });
  });

  it('once() dispose works before event fires', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const disposable = bus.once('analysis:started', handler);

    disposable.dispose();
    bus.emit('analysis:started', { fileCount: 5 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('removeAllForPlugin removes all handlers for that plugin', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    const h3 = vi.fn();

    bus.on('graph:nodeClick', h1, 'plugin-a');
    bus.on('analysis:started', h2, 'plugin-a');
    bus.on('graph:nodeClick', h3, 'plugin-b');

    bus.removeAllForPlugin('plugin-a');

    bus.emit('graph:nodeClick', { node: { id: 'a', label: 'a' }, event: { x: 0, y: 0 } });
    bus.emit('analysis:started', { fileCount: 1 });

    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
    expect(h3).toHaveBeenCalledOnce(); // plugin-b handler still works
  });

  it('listenerCount returns correct count', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('graph:nodeClick')).toBe(0);

    bus.on('graph:nodeClick', () => {});
    expect(bus.listenerCount('graph:nodeClick')).toBe(1);

    bus.on('graph:nodeClick', () => {});
    expect(bus.listenerCount('graph:nodeClick')).toBe(2);
  });

  it('handler errors do not prevent other handlers from running', () => {
    const bus = new EventBus();
    const h1 = vi.fn(() => { throw new Error('boom'); });
    const h2 = vi.fn();

    bus.on('analysis:started', h1);
    bus.on('analysis:started', h2);

    bus.emit('analysis:started', { fileCount: 1 });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('emit with no handlers does not throw', () => {
    const bus = new EventBus();
    expect(() => bus.emit('graph:nodeClick', { node: { id: 'a', label: 'a' }, event: { x: 0, y: 0 } })).not.toThrow();
  });

  it('handler can unsubscribe during emit', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();

    const disposable = bus.on('analysis:started', h1);
    h1.mockImplementation(() => disposable.dispose());
    bus.on('analysis:started', h2);

    bus.emit('analysis:started', { fileCount: 1 });

    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();

    // Second emit — h1 should not be called
    bus.emit('analysis:started', { fileCount: 2 });
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledTimes(2);
  });

  it('on() creates handler set lazily when first handler is registered for an event', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('analysis:started')).toBe(0);

    bus.on('analysis:started', () => {});

    expect(bus.listenerCount('analysis:started')).toBe(1);
  });

  it('on() creates plugin handler set lazily when first handler is registered for a plugin', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.on('analysis:started', handler, 'my-plugin');

    // The handler should be tracked under the plugin — verify via removeAllForPlugin
    bus.removeAllForPlugin('my-plugin');
    bus.emit('analysis:started', { fileCount: 1 });
    expect(handler).not.toHaveBeenCalled();
  });

  it('listenerCount returns 0 for an event that was never subscribed to', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('graph:zoom')).toBe(0);
  });

  it('emit does not call handler after it is removed via off()', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('analysis:started', handler);

    bus.off('analysis:started', handler);
    bus.emit('analysis:started', { fileCount: 1 });

    expect(handler).not.toHaveBeenCalled();
    expect(bus.listenerCount('analysis:started')).toBe(0);
  });

  it('removeAllForPlugin is safe to call with an unknown plugin ID', () => {
    const bus = new EventBus();
    expect(() => bus.removeAllForPlugin('nonexistent')).not.toThrow();
  });

  it('once() with pluginId tracks the handler for plugin cleanup', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    bus.once('analysis:started', handler, 'my-plugin');
    bus.removeAllForPlugin('my-plugin');
    bus.emit('analysis:started', { fileCount: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('emit with empty handler set does not throw', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const disposable = bus.on('analysis:started', handler);
    disposable.dispose();

    // Event key may still exist with size 0 or be deleted; either way emit should not throw
    expect(() => bus.emit('analysis:started', { fileCount: 1 })).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });
});
