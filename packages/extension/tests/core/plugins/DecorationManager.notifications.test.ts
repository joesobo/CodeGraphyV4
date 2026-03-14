import { describe, expect, it, vi } from 'vitest';
import { DecorationManager } from '../../../src/core/plugins/DecorationManager';

describe('DecorationManager notifications', () => {
  it('fires change notifications when node decorations are added', () => {
    const manager = new DecorationManager();
    const listener = vi.fn();

    manager.onDecorationsChanged(listener);
    manager.decorateNode('plugin-a', 'a.ts', { color: '#ff0000' });

    expect(listener).toHaveBeenCalledOnce();
  });

  it('fires change notifications when edge decorations are disposed', () => {
    const manager = new DecorationManager();
    const disposable = manager.decorateEdge('plugin-a', 'a->b', { color: '#ff0000' });
    const listener = vi.fn();

    manager.onDecorationsChanged(listener);
    disposable.dispose();

    expect(listener).toHaveBeenCalledOnce();
  });

  it('fires change notifications when clearing existing edge decorations', () => {
    const manager = new DecorationManager();
    const listener = vi.fn();

    manager.decorateEdge('plugin-a', 'a->b', { color: '#ff0000' });
    manager.onDecorationsChanged(listener);

    manager.clearDecorations('plugin-a');

    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not fire change notifications when clearing a missing plugin', () => {
    const manager = new DecorationManager();
    const listener = vi.fn();

    manager.onDecorationsChanged(listener);
    manager.clearDecorations('missing-plugin');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops notifying a listener after its subscription is disposed', () => {
    const manager = new DecorationManager();
    const listener = vi.fn();
    const subscription = manager.onDecorationsChanged(listener);

    subscription.dispose();
    manager.decorateNode('plugin-a', 'a.ts', { color: '#ff0000' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('logs listener failures and continues notifying later listeners', () => {
    const manager = new DecorationManager();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failingListener = vi.fn(() => {
      throw new Error('boom');
    });
    const healthyListener = vi.fn();

    manager.onDecorationsChanged(failingListener);
    manager.onDecorationsChanged(healthyListener);

    manager.decorateNode('plugin-a', 'a.ts', { color: '#ff0000' });

    expect(failingListener).toHaveBeenCalledOnce();
    expect(healthyListener).toHaveBeenCalledOnce();
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[CodeGraphy] Error in decoration change listener:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
