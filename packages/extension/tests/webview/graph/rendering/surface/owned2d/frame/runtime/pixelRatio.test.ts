import { afterEach, describe, expect, it, vi } from 'vitest';
import { observeDevicePixelRatio } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/pixelRatio';

interface MediaQueryHarness {
  change(): void;
  query: string;
  removeEventListener: ReturnType<typeof vi.fn>;
}

const mediaQueries: MediaQueryHarness[] = [];

function installMediaQueryHarness(): void {
  vi.stubGlobal('matchMedia', vi.fn((query: string) => {
    let changeListener: (() => void) | undefined;
    const harness: MediaQueryHarness = {
      change: () => changeListener?.(),
      query,
      removeEventListener: vi.fn((_type: string, listener: () => void) => {
        if (changeListener === listener) changeListener = undefined;
      }),
    };
    mediaQueries.push(harness);
    return {
      addEventListener: vi.fn((_type: string, listener: () => void) => {
        changeListener = listener;
      }),
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

    vi.stubGlobal('devicePixelRatio', 2);
    mediaQueries[0]?.change();

    expect(invalidate).toHaveBeenCalledOnce();
    expect(mediaQueries[0]?.removeEventListener).toHaveBeenCalledOnce();
    expect(mediaQueries[1]?.query).toBe('(resolution: 2dppx)');
    dispose();
  });

  it('uses window scale changes and removes every listener on disposal', () => {
    vi.stubGlobal('devicePixelRatio', 1);
    installMediaQueryHarness();
    const invalidate = vi.fn();

    const dispose = observeDevicePixelRatio(invalidate);
    vi.stubGlobal('devicePixelRatio', 1.5);
    window.dispatchEvent(new Event('resize'));
    expect(invalidate).toHaveBeenCalledOnce();
    expect(mediaQueries[1]?.query).toBe('(resolution: 1.5dppx)');

    dispose();
    expect(mediaQueries[1]?.removeEventListener).toHaveBeenCalledOnce();
    vi.stubGlobal('devicePixelRatio', 2);
    window.dispatchEvent(new Event('resize'));
    mediaQueries[1]?.change();
    expect(invalidate).toHaveBeenCalledOnce();
  });
});
