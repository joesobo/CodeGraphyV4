import { describe, expect, it, vi } from 'vitest';
import { createExtensionMessageEmitter } from '../../../../src/extension/graphView/provider/extensionMessages';

describe('graphView/provider/extensionMessages', () => {
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
});
