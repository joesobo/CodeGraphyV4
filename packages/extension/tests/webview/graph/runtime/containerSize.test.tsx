import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useContainerSize } from '../../../../src/webview/components/graph/runtime/containerSize';

class MockResizeObserver {
  callback: ResizeObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
}

describe('useContainerSize', () => {
  let observers: MockResizeObserver[];

  beforeEach(() => {
    observers = [];
    vi.stubGlobal('ResizeObserver', class extends MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        super(callback);
        observers.push(this);
      }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('tracks the initial container size and resize updates', () => {
    const element = document.createElement('div');
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 320 });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 180 });
    const ref = { current: element };

    const { result, unmount } = renderHook(() => useContainerSize(ref));

    expect(result.current).toEqual({ width: 320, height: 180 });
    expect(observers[0]?.observe).toHaveBeenCalledWith(element);

    act(() => {
      observers[0]?.callback([
        {
          contentRect: {
            height: 240,
            width: 640,
          },
        } as ResizeObserverEntry,
      ], observers[0] as unknown as ResizeObserver);
    });

    expect(result.current).toEqual({ width: 640, height: 240 });

    unmount();

    expect(observers[0]?.disconnect).toHaveBeenCalledOnce();
  });
});
