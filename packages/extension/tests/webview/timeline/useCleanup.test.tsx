import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cleanupTimelineController } = vi.hoisted(() => ({
  cleanupTimelineController: vi.fn(),
}));

vi.mock('../../../src/webview/components/timeline/cleanup', () => ({
  cleanupTimelineController,
}));

import { useTimelineCleanup } from '../../../src/webview/components/timeline/useCleanup';

describe('timeline/useCleanup', () => {
  beforeEach(() => {
    cleanupTimelineController.mockReset();
  });

  it('runs controller cleanup on unmount with the tracked refs', () => {
    const debounceTimerRef = { current: null };
    const rafRef = { current: null };
    const scrubResetTimerRef = { current: null };
    const { unmount } = renderHook(() => useTimelineCleanup({
      debounceTimerRef,
      rafRef,
      scrubResetTimerRef,
    }));

    expect(cleanupTimelineController).not.toHaveBeenCalled();

    unmount();

    expect(cleanupTimelineController).toHaveBeenCalledWith({
      debounceTimerRef,
      rafRef,
      scrubResetTimerRef,
    });
  });

  it('cleans up the previous refs when the tracked refs change', () => {
    const firstRefs = {
      debounceTimerRef: { current: null },
      rafRef: { current: null },
      scrubResetTimerRef: { current: null },
    };
    const secondRefs = {
      debounceTimerRef: { current: null },
      rafRef: { current: 9 },
      scrubResetTimerRef: { current: null },
    };

    const { rerender, unmount } = renderHook(
      ({ refs }) => useTimelineCleanup(refs),
      { initialProps: { refs: firstRefs } },
    );

    rerender({ refs: secondRefs });

    expect(cleanupTimelineController).toHaveBeenCalledTimes(1);
    expect(cleanupTimelineController).toHaveBeenNthCalledWith(1, firstRefs);

    unmount();

    expect(cleanupTimelineController).toHaveBeenCalledTimes(2);
    expect(cleanupTimelineController).toHaveBeenNthCalledWith(2, secondRefs);
  });
});
