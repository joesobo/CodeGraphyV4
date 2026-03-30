import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { usePluginManager } from '../../../src/webview/pluginRuntime/useManager';

function toDataUrlModule(source: string): string {
  return `data:text/javascript,${encodeURIComponent(source)}`;
}

describe('usePluginManager', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as Record<string, unknown>).__useManagerApiRefs;
    delete (globalThis as Record<string, unknown>).__useManagerActivationCount;
    delete (globalThis as Record<string, unknown>).__useManagerWarnings;
    delete (globalThis as Record<string, unknown>).__useManagerContainers;
  });

  it('returns a stable pluginHost reference across re-renders', () => {
    const { result, rerender } = renderHook(() => usePluginManager());

    const firstHost = result.current.pluginHost;
    rerender();

    expect(result.current.pluginHost).toBe(firstHost);
  });

  it('returns a stable injectPluginAssets reference across re-renders', () => {
    const { result, rerender } = renderHook(() => usePluginManager());

    const firstInject = result.current.injectPluginAssets;
    rerender();

    expect(result.current.injectPluginAssets).toBe(firstInject);
  });

  it('injects a stylesheet link for a new style url', async () => {
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
    expect((links[0] as HTMLLinkElement).href).toContain('style.css');
  });

  it('does not inject the same stylesheet twice', async () => {
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/style.css'],
      });
    });

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/style.css'],
      });
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
  });

  it('injects multiple styles without duplication', async () => {
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/a.css', 'https://example.com/b.css'],
      });
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(2);
  });

  it('creates stylesheet link elements with rel=stylesheet', async () => {
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/test.css'],
      });
    });

    const link = document.head.querySelector('link') as HTMLLinkElement;
    expect(link.rel).toBe('stylesheet');
    expect(link.href).toContain('test.css');
  });

  it('activates a plugin script that exports a named activate function', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate(api) {
        globalThis.__useManagerActivationCount = (globalThis.__useManagerActivationCount || 0) + 1;
        const containers = globalThis.__useManagerContainers || (globalThis.__useManagerContainers = []);
        containers.push(api.getContainer());
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect((globalThis as Record<string, unknown>).__useManagerActivationCount).toBe(1);
    const containers = (globalThis as Record<string, unknown>).__useManagerContainers as HTMLDivElement[];
    expect(containers).toHaveLength(1);
    expect(containers[0].getAttribute('data-cg-plugin')).toBe('test-plugin');
    expect(document.body.contains(containers[0])).toBe(true);
  });

  it('reuses the same API object for scripts activated by the same plugin', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptA = toDataUrlModule(`
      export function activate(api) {
        const containers = globalThis.__useManagerContainers || (globalThis.__useManagerContainers = []);
        containers.push(api.getContainer());
      }
    `);
    const scriptB = toDataUrlModule(`
      export function activate(api) {
        const containers = globalThis.__useManagerContainers || (globalThis.__useManagerContainers = []);
        globalThis.__useManagerScriptB = true;
        containers.push(api.getContainer());
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'same-plugin',
        scripts: [scriptA],
        styles: [],
      });
    });

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'same-plugin',
        scripts: [scriptB],
        styles: [],
      });
    });

    const containers = (globalThis as Record<string, unknown>).__useManagerContainers as HTMLDivElement[];
    expect(containers).toHaveLength(2);
    expect(containers[0]).toBe(containers[1]);
  });

  it('activates the same script separately for different plugins', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate() {
        globalThis.__useManagerActivationCount = (globalThis.__useManagerActivationCount || 0) + 1;
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'plugin-a',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'plugin-b',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect((globalThis as Record<string, unknown>).__useManagerActivationCount).toBe(2);
  });

  it('does not re-activate the same script for the same plugin after successful activation', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate() {
        globalThis.__useManagerActivationCount = (globalThis.__useManagerActivationCount || 0) + 1;
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'dedup-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'dedup-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect((globalThis as Record<string, unknown>).__useManagerActivationCount).toBe(1);
  });

  it('warns when a script has no activate export', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule('export const version = 1;');

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('has no activate(api) export'),
    );
  });

  it('logs errors for scripts that fail to import', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: ['https://nonexistent.example.com/bad-script.js'],
        styles: [],
      });
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to activate webview plugin script'),
      expect.anything(),
    );
  });

  it('logs errors when activation throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate() {
        throw new Error('boom');
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to activate webview plugin script'),
      expect.any(Error),
    );
  });

  it('returns a pluginHost that can be used to build plugin APIs', () => {
    const { result } = renderHook(() => usePluginManager());

    expect(result.current.pluginHost).toBeDefined();
    expect(typeof result.current.pluginHost.createAPI).toBe('function');
  });
});
