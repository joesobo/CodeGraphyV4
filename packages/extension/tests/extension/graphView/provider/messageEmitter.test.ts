import { describe, expect, it, vi } from 'vitest';
import { createExtensionMessageEmitter } from '../../../../src/extension/graphView/provider/messageEmitter';

describe('graphView/provider/messageEmitter', () => {
  it('delivers fired messages to registered handlers and removes disposed handlers', () => {
    const emitter = createExtensionMessageEmitter();
    const first = vi.fn();
    const second = vi.fn();
    const disposable = emitter.event(first);

    emitter.event(second);
    emitter.fire({ type: 'TEST' });
    disposable.dispose();
    emitter.fire({ type: 'SECOND' });

    expect(first).toHaveBeenCalledOnce();
    expect(first).toHaveBeenCalledWith({ type: 'TEST' });
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('clears all handlers when the emitter is disposed', () => {
    const emitter = createExtensionMessageEmitter();
    const first = vi.fn();
    const second = vi.fn();

    emitter.event(first);
    emitter.event(second);
    emitter.dispose();
    emitter.fire({ type: 'IGNORED' });

    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
  });
});
