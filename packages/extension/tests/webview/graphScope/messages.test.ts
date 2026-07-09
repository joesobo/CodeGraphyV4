import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GRAPH_SCOPE_VISIBILITY_MESSAGE_DEBOUNCE_MS,
  resetGraphScopeVisibilityMessageQueueForTests,
  scheduleEdgeVisibilityMessage,
  scheduleNodeVisibilityMessage,
} from '../../../src/webview/components/graphScope/messages';

describe('graph scope messages', () => {
  beforeEach(() => {
    const sentMessages = (globalThis as unknown as { __vscodeSentMessages: unknown[] }).__vscodeSentMessages;
    sentMessages.length = 0;
    resetGraphScopeVisibilityMessageQueueForTests();
  });

  afterEach(() => {
    resetGraphScopeVisibilityMessageQueueForTests();
    vi.useRealTimers();
  });

  it('coalesces rapid visibility changes into one graph control update', () => {
    vi.useFakeTimers();
    const sentMessages = (globalThis as unknown as { __vscodeSentMessages: unknown[] }).__vscodeSentMessages;

    scheduleNodeVisibilityMessage('symbol:function', true);
    scheduleNodeVisibilityMessage('symbol:function', false);
    scheduleNodeVisibilityMessage('symbol:prototype', true);
    scheduleEdgeVisibilityMessage('include', true);

    expect(sentMessages).toEqual([]);

    vi.advanceTimersByTime(GRAPH_SCOPE_VISIBILITY_MESSAGE_DEBOUNCE_MS - 1);
    expect(sentMessages).toEqual([]);

    vi.advanceTimersByTime(1);

    expect(sentMessages).toEqual([
      {
        type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
        payload: {
          nodeVisibility: {
            'symbol:function': false,
            'symbol:prototype': true,
          },
          edgeVisibility: {
            include: true,
          },
        },
      },
    ]);

  });

  it('acknowledges a correlated toggle only after its batch is posted', () => {
    vi.useFakeTimers();
    const onPosted = vi.fn();

    scheduleNodeVisibilityMessage('file', false, onPosted);

    expect(onPosted).not.toHaveBeenCalled();
    vi.advanceTimersByTime(GRAPH_SCOPE_VISIBILITY_MESSAGE_DEBOUNCE_MS);
    expect(onPosted).toHaveBeenCalledOnce();
  });
});
