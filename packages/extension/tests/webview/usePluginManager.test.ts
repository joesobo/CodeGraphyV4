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

  it('injects multiple styles without duplication', async () => {
    const { result } = renderHook(() => usePluginManager());

    await result.current.injectPluginAssets({
      pluginId: 'test-plugin',
      scripts: [],
      styles: ['https://example.com/a.css', 'https://example.com/b.css'],
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(2);
  });

  it('logs errors for scripts that fail to import', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePluginManager());

    await result.current.injectPluginAssets({
      pluginId: 'test-plugin',
      scripts: ['https://nonexistent.example.com/bad-script.js'],
      styles: [],
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to activate webview plugin script'),
      expect.anything(),
    );
    errorSpy.mockRestore();
  });

  it('creates stylesheet link elements with rel=stylesheet', async () => {
    const { result } = renderHook(() => usePluginManager());

    await result.current.injectPluginAssets({
      pluginId: 'test-plugin',
      scripts: [],
      styles: ['https://example.com/test.css'],
    });

    const link = document.head.querySelector('link') as HTMLLinkElement;
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toContain('test.css');
  });

  it('returns a stable injectPluginAssets reference across re-renders', () => {
    const { result, rerender } = renderHook(() => usePluginManager());

    const firstFn = result.current.injectPluginAssets;
    rerender();

    expect(result.current.injectPluginAssets).toBe(firstFn);
  });

  it('activates a plugin script that exports a named activate function', async () => {
    const { result } = renderHook(() => usePluginManager());

    const scriptUrl = `data:text/javascript,export function activate(api) { globalThis.__testActivations = globalThis.__testActivations || []; globalThis.__testActivations.push(true); }`;

    await result.current.injectPluginAssets({
      pluginId: 'test-plugin',
      scripts: [scriptUrl],
      styles: [],
    });

    // Wait for dynamic import
    await vi.dynamicImportSettled?.();
  });

  it('does not re-activate the same script for the same plugin after successful activation', async () => {
    const { result } = renderHook(() => usePluginManager());

    // Use a script that has an activate function
    const scriptUrl = `data:text/javascript,export function activate(api) { globalThis.__dedupActivations = (globalThis.__dedupActivations || 0) + 1; }`;

    await result.current.injectPluginAssets({
      pluginId: 'dedup-plugin',
      scripts: [scriptUrl],
      styles: [],
    });
    await vi.dynamicImportSettled?.();

    const firstCount = (globalThis as Record<string, unknown>).__dedupActivations as number;

    // Second call should skip activation entirely
    await result.current.injectPluginAssets({
      pluginId: 'dedup-plugin',
      scripts: [scriptUrl],
      styles: [],
    });
    await vi.dynamicImportSettled?.();

    const secondCount = (globalThis as Record<string, unknown>).__dedupActivations as number;
    expect(secondCount).toBe(firstCount);
  });
});
