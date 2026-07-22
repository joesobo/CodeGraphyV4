import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeDevicePixelRatio } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/pixelRatio';

interface MediaQueryHarness {
  change(): void;
  fireRemovedChange(): void;
  query: string;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

const mediaQueries: MediaQueryHarness[] = [];

function installMediaQueryHarness(): void {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    let changeListener: (() => void) | undefined;
    let removedChangeListener: (() => void) | undefined;
    const harness: MediaQueryHarness = {
      change: () => changeListener?.(),
      fireRemovedChange: () => removedChangeListener?.(),
      query,
      addEventListener: vi.fn((_type: string, listener: () => void) => {
        changeListener = listener;
      }),
      removeEventListener: vi.fn((_type: string, listener: () => void) => {
        if (changeListener === listener) {
          removedChangeListener = changeListener;
          changeListener = undefined;
        }
      }),
    };
    mediaQueries.push(harness);
    return {
      addEventListener: harness.addEventListener,
      removeEventListener: harness.removeEventListener,
    };
  }));
}

afterEach(() => {
  mediaQueries.length = 0;
  vi.unstubAllGlobals();
});

describe('device pixel ratio observation', () => {
  it('invalidates and retargets the media query when device scale changes', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    installMediaQueryHarness();
    const invalidate = vi.fn();

    const dispose = observeDevicePixelRatio(invalidate);
    expect(mediaQueries[0]?.query).toBe('(resolution: 1dppx)');
    expect(mediaQueries[0]?.addEventListener)
      .toHaveBeenCalledWith('change', expect.any(Function));

    mediaQueries[0]?.change();
    expect(invalidate).not.toHaveBeenCalled();
    expect(mediaQueries).toHaveLength(1);

    vi.stubGlobal('devicePixelRatio', 2);
    mediaQueries[0]?.change();

    expect(invalidate).toHaveBeenCalledOnce();
    expect(mediaQueries[0]?.removeEventListener)
      .toHaveBeenCalledWith('change', expect.any(Function));
    expect(mediaQueries[1]?.query).toBe('(resolution: 2dppx)');
    dispose();
  });

  it('uses window scale changes and removes every listener on disposal', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    installMediaQueryHarness();
    const invalidate = vi.fn();
    const addWindowListener = vi.spyOn(window, 'addEventListener');
    const removeWindowListener = vi.spyOn(window, 'removeEventListener');

    const dispose = observeDevicePixelRatio(invalidate);
    expect(addWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
    vi.stubGlobal('devicePixelRatio', 1.5);
    window.dispatchEvent(new Event('resize'));
    expect(invalidate).toHaveBeenCalledOnce();
    expect(mediaQueries[1]?.query).toBe('(resolution: 1.5dppx)');

    dispose();
    expect(mediaQueries[1]?.removeEventListener).toHaveBeenCalledOnce();
    expect(removeWindowListener).toHaveBeenCalledWith('resize', expect.any(Function));
    dispose();
    expect(mediaQueries[1]?.removeEventListener).toHaveBeenCalledOnce();
    expect(removeWindowListener).toHaveBeenCalledOnce();
    vi.stubGlobal('devicePixelRatio', 2);
    window.dispatchEvent(new Event('resize'));
    mediaQueries[1]?.change();
    mediaQueries[1]?.fireRemovedChange();
    expect(invalidate).toHaveBeenCalledOnce();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    'falls back to one for invalid initial ratio %s',
    invalidRatio => {
      vi.stubGlobal('devicePixelRatio', invalidRatio);
      installMediaQueryHarness();

      const dispose = observeDevicePixelRatio(vi.fn());

      expect(mediaQueries[0]?.query).toBe('(resolution: 1dppx)');
      dispose();
    },
  );
});
