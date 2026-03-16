import { describe, expect, it } from 'vitest';
import { createFallbackContextMenuEvent } from '../../../src/webview/components/graph/contextMenuRuntimeFallbackEvent';

describe('graph/contextMenuRuntimeFallbackEvent', () => {
  it('creates a right-click context menu event with pointer coordinates', () => {
    const event = createFallbackContextMenuEvent(48, 64, true);

    expect(event.type).toBe('contextmenu');
    expect(event.button).toBe(2);
    expect(event.buttons).toBe(2);
    expect(event.clientX).toBe(48);
    expect(event.clientY).toBe(64);
    expect(event.ctrlKey).toBe(true);
    expect(event.bubbles).toBe(true);
    expect(event.cancelable).toBe(true);
  });
});
