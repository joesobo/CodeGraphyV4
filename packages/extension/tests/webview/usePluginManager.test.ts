import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePluginManager } from '../../src/webview/usePluginManager';

describe('usePluginManager', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a stable pluginHost reference across re-renders', () => {
    const { result, rerender } = renderHook(() => usePluginManager());

    const firstHost = result.current.pluginHost;
    rerender();

    expect(result.current.pluginHost).toBe(firstHost);
  });

  it('injects a stylesheet link for a new style url', async () => {
    const { result } = renderHook(() => usePluginManager());

    await result.current.injectPluginAssets({
      pluginId: 'test-plugin',
      scripts: [],
      styles: ['https://example.com/style.css'],
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLLinkElement).href).toContain('style.css');
  });

  it('does not inject the same stylesheet twice', async () => {
    const { result } = renderHook(() => usePluginManager());

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

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
  });

  it('returns an injectPluginAssets function', () => {
    const { result } = renderHook(() => usePluginManager());

    expect(typeof result.current.injectPluginAssets).toBe('function');
  });
});
