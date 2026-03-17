/**
 * @fileoverview Tests targeting surviving mutants in eventBus.ts.
 *
 * Surviving mutants:
 * - L35:9  ConditionalExpression: true (if (pluginId) → if (true))
 * - L70:22 ConditionalExpression: false (if (!handlers || handlers.size === 0) → false)
 * - L75:19 BlockStatement: {} ({ console.error(...) } → {})
 * - L76:23 StringLiteral: `` (event name in error message → empty string)
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../../src/core/plugins/eventBus';

describe('EventBus pluginId guard (L35 mutant)', () => {
  it('does not track handlers under a plugin when no pluginId is provided', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    // Register without pluginId
    bus.on('analysis:started', handler);

    // If the guard `if (pluginId)` is mutated to `if (true)`,
    // this would try to get/set _pluginHandlers.get(undefined),
    // and removeAllForPlugin('undefined') might remove it.
    // But more importantly, calling removeAllForPlugin with any string
    // should NOT remove a handler registered without a pluginId.
    bus.removeAllForPlugin('undefined');
    bus.removeAllForPlugin('');

    bus.emit('analysis:started', { fileCount: 1 });

    // Handler should still be called because it was not registered with a pluginId
    expect(handler).toHaveBeenCalledOnce();
  });

  it('only tracks handlers for the specified pluginId', () => {
    const bus = new EventBus();
    const handlerA = vi.fn();
    const handlerB = vi.fn();

    // Register handlerA without pluginId, handlerB with pluginId
    bus.on('analysis:started', handlerA);
    bus.on('analysis:started', handlerB, 'my-plugin');

    // Remove all for 'my-plugin' — should only remove handlerB
    bus.removeAllForPlugin('my-plugin');

    bus.emit('analysis:started', { fileCount: 1 });

    expect(handlerA).toHaveBeenCalledOnce();
    expect(handlerB).not.toHaveBeenCalled();
  });
});

describe('EventBus emit early return (L70 mutant)', () => {
  it('does not execute handler logic when handlers set is empty', () => {
    const bus = new EventBus();
    const handler = vi.fn();

    // Register and then remove
    const disposable = bus.on('analysis:started', handler);
    disposable.dispose();

    // At this point the handlers set may be empty (size === 0)
    // If the guard `if (!handlers || handlers.size === 0) return;` is mutated to false,
    // it would try to iterate over an empty set, which would be a no-op anyway.
    // But for the `!handlers` branch, we can also test emitting an event that was never registered.
    bus.emit('analysis:started', { fileCount: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('returns early without iterating when no handlers exist for the event', () => {
    const bus = new EventBus();

    // Emit an event that has no registered handlers at all
    // If the guard is removed (mutated to false), the code would try to spread
    // `undefined` handlers, causing a runtime error
    expect(() => {
      bus.emit('graph:zoom', { level: 1 });
    }).not.toThrow();
  });

  it('does not call any handler after all handlers are disposed', () => {
    const bus = new EventBus();
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const d1 = bus.on('analysis:started', handler1);
    const d2 = bus.on('analysis:started', handler2);

    d1.dispose();
    d2.dispose();

    // handlers set exists but size is 0
    bus.emit('analysis:started', { fileCount: 1 });

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });
});

describe('EventBus error handling in emit (L75-L76 mutants)', () => {
  it('logs the error with console.error when a handler throws', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('test error');
    bus.on('analysis:started', () => { throw error; });

    bus.emit('analysis:started', { fileCount: 1 });

    // L75:19 BlockStatement:{} would skip the console.error call entirely
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('includes the event name in the error message', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('handler failed');
    bus.on('analysis:started', () => { throw error; });

    bus.emit('analysis:started', { fileCount: 1 });

    // L76:23 StringLiteral mutant would change the event name to empty string
    const errorMessage = errorSpy.mock.calls[0]?.[0] as string;
    expect(errorMessage).toContain('analysis:started');

    errorSpy.mockRestore();
  });

  it('includes the [CodeGraphy] prefix in the error message', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    bus.on('graph:nodeClick', () => { throw new Error('boom'); });
    bus.emit('graph:nodeClick', { node: { id: 'a', label: 'a' }, event: { x: 0, y: 0 } });

    const errorMessage = errorSpy.mock.calls[0]?.[0] as string;
    expect(errorMessage).toContain('[CodeGraphy]');
    expect(errorMessage).toContain('graph:nodeClick');

    errorSpy.mockRestore();
  });

  it('passes the thrown error object as the second argument to console.error', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const error = new Error('specific error');
    bus.on('analysis:started', () => { throw error; });

    bus.emit('analysis:started', { fileCount: 1 });

    // Verify the actual error object is passed
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('analysis:started'),
      error
    );

    errorSpy.mockRestore();
  });

  it('continues to call remaining handlers after one throws', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const secondHandler = vi.fn();

    bus.on('analysis:started', () => { throw new Error('first fails'); });
    bus.on('analysis:started', secondHandler);

    bus.emit('analysis:started', { fileCount: 1 });

    // The error should be logged, and the second handler should still execute
    expect(errorSpy).toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalledOnce();

    errorSpy.mockRestore();
  });
});
