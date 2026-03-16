import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { cleanupTimelineController } = vi.hoisted(() => ({
  cleanupTimelineController: vi.fn(),
}));

vi.mock('../../../src/webview/components/timeline/cleanup', () => ({
  cleanupTimelineController,
}));

import { useTimelineCleanup } from '../../../src/webview/components/timeline/useCleanup';

describe('timeline/useCleanup', () => {
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
});
