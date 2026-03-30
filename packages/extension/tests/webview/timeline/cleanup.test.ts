import type { MutableRefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupTimelineController,
  stopTimelinePlayback,
} from '../../../src/webview/components/timeline/cleanup';

function createRef<T>(current: T): MutableRefObject<T> {
  return { current } as MutableRefObject<T>;
}

describe('timeline/cleanup', () => {
  let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    cancelAnimationFrameMock = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('cancels pending timers and the active animation frame during cleanup', () => {
    const debounceCallback = vi.fn();
    const scrubResetCallback = vi.fn();

    cleanupTimelineController({
      debounceTimerRef: createRef<ReturnType<typeof setTimeout> | null>(setTimeout(debounceCallback, 100) as unknown as ReturnType<typeof setTimeout>),
      rafRef: createRef<number | null>(17),
      scrubResetTimerRef: createRef<ReturnType<typeof setTimeout> | null>(setTimeout(scrubResetCallback, 100) as unknown as ReturnType<typeof setTimeout>),
    });

    vi.advanceTimersByTime(150);

    expect(debounceCallback).not.toHaveBeenCalled();
    expect(scrubResetCallback).not.toHaveBeenCalled();
    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(17);
  });

  it('stops playback and clears the stored animation frame id', () => {
    const rafRef = createRef<number | null>(23);

    stopTimelinePlayback(rafRef);

    expect(cancelAnimationFrameMock).toHaveBeenCalledWith(23);
    expect(rafRef.current).toBeNull();
  });

  it('leaves playback refs unchanged when there is no active animation frame', () => {
    const rafRef = createRef<number | null>(null);

    stopTimelinePlayback(rafRef);

    expect(cancelAnimationFrameMock).not.toHaveBeenCalled();
    expect(rafRef.current).toBeNull();
  });

  it('ignores missing cleanup refs instead of clearing null handles', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    cleanupTimelineController({
      debounceTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
      rafRef: createRef<number | null>(null),
      scrubResetTimerRef: createRef<ReturnType<typeof setTimeout> | null>(null),
    });

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(cancelAnimationFrameMock).not.toHaveBeenCalled();
  });
});
