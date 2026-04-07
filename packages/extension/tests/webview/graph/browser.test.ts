import { describe, expect, it } from 'vitest';

describe('graph/browser', () => {
  it('returns the browser navigator when available', async () => {
    const originalNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { platform: 'MacIntel' },
    });

    const { getGraphNavigator } = await import('../../../src/webview/components/graph/browser');

    expect(getGraphNavigator()).toEqual({ platform: 'MacIntel' });

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('returns the browser window when available', async () => {
    const { getGraphWindow } = await import('../../../src/webview/components/graph/browser');

    expect(getGraphWindow()).toBe(window);
  });
});
