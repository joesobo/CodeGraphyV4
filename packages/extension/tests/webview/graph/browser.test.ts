import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('graph/browser', () => {
  it('returns the browser navigator when available', async () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel' });

    const { getGraphNavigator } = await import('../../../src/webview/components/graph/browser');

    expect(getGraphNavigator()).toEqual({ platform: 'MacIntel' });
  });

  it('returns the browser window when available', async () => {
    const { getGraphWindow } = await import('../../../src/webview/components/graph/browser');

    expect(getGraphWindow()).toBe(window);
  });

  it('returns undefined when navigator or window are unavailable', async () => {
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('window', undefined);

    const { getGraphNavigator, getGraphWindow } = await import(
      '../../../src/webview/components/graph/browser'
    );

    expect(getGraphNavigator()).toBeUndefined();
    expect(getGraphWindow()).toBeUndefined();
  });
});
