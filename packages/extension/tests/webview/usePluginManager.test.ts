import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePluginManager } from '../../src/webview/hooks/usePluginManager';

describe('usePluginManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Reset document.head between tests
    document.head.innerHTML = '';
  });

  it('returns a stable pluginHost instance across re-renders', () => {
    const { result, rerender } = renderHook(() => usePluginManager());
    const firstHost = result.current.pluginHost;
    rerender();
    expect(result.current.pluginHost).toBe(firstHost);
  });

  it('getPluginApi returns the same API instance for repeated calls with the same pluginId', () => {
    const { result } = renderHook(() => usePluginManager());
    const api1 = result.current.getPluginApi('my-plugin');
    const api2 = result.current.getPluginApi('my-plugin');
    expect(api1).toBe(api2);
  });

  it('getPluginApi returns different instances for different plugin IDs', () => {
    const { result } = renderHook(() => usePluginManager());
    const api1 = result.current.getPluginApi('plugin-a');
    const api2 = result.current.getPluginApi('plugin-b');
    expect(api1).not.toBe(api2);
  });

  it('injectPluginAssets injects a link element for each style URL', async () => {
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/style.css'],
      });
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLLinkElement).href).toBe('https://example.com/style.css');
  });

  it('injectPluginAssets does not inject duplicate style links', async () => {
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/style.css'],
      });
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/style.css'],
      });
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
  });

  it('injectPluginAssets does not throw when scripts array is empty', async () => {
    const { result } = renderHook(() => usePluginManager());

    await expect(
      act(async () => {
        await result.current.injectPluginAssets({
          pluginId: 'test-plugin',
          scripts: [],
          styles: [],
        });
      })
    ).resolves.not.toThrow();
  });
});
