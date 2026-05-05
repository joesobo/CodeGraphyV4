import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MutableRefObject } from 'react';
import {
  clearHoldTimers,
  scheduleContinuousZoom,
} from '../../../../src/webview/components/graphCornerControls/zoom/timers';

function timerRef(value: number | null = null): MutableRefObject<number | null> {
  return { current: value };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('graphCornerControls/zoom/timers', () => {
  it('does not clear timers when no hold timers are active', () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    clearHoldTimers(timerRef(), timerRef());

    expect(clearTimeoutSpy).not.toHaveBeenCalled();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  it('clears active delay and interval timers', () => {
    vi.useFakeTimers();
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const delay = window.setTimeout(() => undefined, 100);
    const interval = window.setInterval(() => undefined, 100);
    const delayRef = timerRef(delay);
    const intervalRef = timerRef(interval);

    clearHoldTimers(delayRef, intervalRef);

    expect(clearTimeoutSpy).toHaveBeenCalledWith(delay);
    expect(clearIntervalSpy).toHaveBeenCalledWith(interval);
    expect(delayRef.current).toBeNull();
    expect(intervalRef.current).toBeNull();
  });

  it('posts once after the hold delay and repeats at the hold interval', () => {
    vi.useFakeTimers();
    const postZoom = vi.fn();
    const delayRef = timerRef();
    const intervalRef = timerRef();

    scheduleContinuousZoom(postZoom, delayRef, intervalRef);

    expect(delayRef.current).not.toBeNull();
    vi.advanceTimersByTime(249);
    expect(postZoom).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(postZoom).toHaveBeenCalledTimes(1);
    expect(intervalRef.current).not.toBeNull();
    vi.advanceTimersByTime(90);
    expect(postZoom).toHaveBeenCalledTimes(2);
  });
});
