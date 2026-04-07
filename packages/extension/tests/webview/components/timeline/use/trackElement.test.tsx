import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTimelineTrackElement } from '../../../../../src/webview/components/timeline/use/trackElement';

function createTrack(width: number = 300): HTMLDivElement {
  const track = document.createElement('div');
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    bottom: 24,
    height: 24,
    left: 0,
    right: width,
    top: 0,
    width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  return track;
}

describe('timeline/use/trackElement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the ref in sync and measures the track width', () => {
    const trackElementRef = { current: null } as { current: HTMLDivElement | null };
    const { result } = renderHook(() => useTimelineTrackElement({ trackElementRef }));
    const track = createTrack(320);

    act(() => {
      result.current.setTrackElement(track);
    });

    expect(trackElementRef.current).toBe(track);
    expect(result.current.trackWidth).toBe(320);
  });

  it('updates the width from ResizeObserver entries when available', () => {
    let callback: ResizeObserverCallback = () => undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();

    class MockResizeObserver {
      constructor(nextCallback: ResizeObserverCallback) {
        callback = nextCallback;
      }

      observe = observe;
      disconnect = disconnect;
    }

    vi.stubGlobal('ResizeObserver', MockResizeObserver as never);

    const trackElementRef = { current: null } as { current: HTMLDivElement | null };
    const { result } = renderHook(() => useTimelineTrackElement({ trackElementRef }));
    const track = createTrack(320);

    act(() => {
      result.current.setTrackElement(track);
    });

    act(() => {
      callback([
        {
          contentRect: { width: 480 } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ] as ResizeObserverEntry[], {} as ResizeObserver);
    });

    expect(observe).toHaveBeenCalledWith(track);
    expect(result.current.trackWidth).toBe(480);
    expect(disconnect).not.toHaveBeenCalled();
  });
});
