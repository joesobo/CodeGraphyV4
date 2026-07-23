import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
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
    delete (globalThis as Record<string, unknown>).__useManagerResolveModule;
    delete (globalThis as Record<string, unknown>).__useManagerCleanupCount;
    delete (globalThis as Record<string, unknown>).__useManagerMessages;
    delete (globalThis as Record<string, unknown>).__useManagerPluginData;
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

  it('removes plugin stylesheet links when plugin assets are reset', async () => {
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'style-plugin',
        scripts: [],
        styles: ['https://example.com/style.css'],
      });
    });

    expect(document.head.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(1);

    result.current.resetPluginAssets('style-plugin');

    expect(document.head.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(0);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'style-plugin',
        scripts: [],
        styles: ['https://example.com/style.css'],
      });
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(1);
    expect((links[0] as HTMLLinkElement).href).toContain('style.css');
  });

  it('keeps a shared stylesheet while another plugin still owns it', async () => {
    const { result } = renderHook(() => usePluginManager());
    const sharedStyle = 'https://example.com/shared.css';

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'plugin-a',
        scripts: [],
        styles: [sharedStyle],
      });
      await result.current.injectPluginAssets({
        pluginId: 'plugin-b',
        scripts: [],
        styles: [sharedStyle],
      });
    });

    expect(document.head.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(1);

    result.current.resetPluginAssets('plugin-a');

    expect(document.head.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(1);

    result.current.resetPluginAssets('plugin-b');

    expect(document.head.querySelectorAll('link[rel="stylesheet"]')).toHaveLength(0);
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

  it('coalesces concurrent activation of the same script for the same plugin', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      await new Promise((resolve) => {
        globalThis.__useManagerResolveModule = resolve;
      });
      export function activate() {
        globalThis.__useManagerActivationCount = (globalThis.__useManagerActivationCount || 0) + 1;
      }
    `);

    const first = result.current.injectPluginAssets({
      pluginId: 'dedup-plugin',
      scripts: [scriptUrl],
      styles: [],
    });
    const second = result.current.injectPluginAssets({
      pluginId: 'dedup-plugin',
      scripts: [scriptUrl],
      styles: [],
    });

    await waitFor(() => {
      expect((globalThis as Record<string, unknown>).__useManagerResolveModule)
        .toEqual(expect.any(Function));
    });

    await act(async () => {
      const globals = globalThis as unknown as Record<string, (() => void) | undefined>;
      globals.__useManagerResolveModule?.();
      await Promise.all([first, second]);
    });

    expect((globalThis as Record<string, unknown>).__useManagerActivationCount).toBe(1);
  });

  it('can re-activate the same script after plugin assets are reset', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate() {
        globalThis.__useManagerActivationCount = (globalThis.__useManagerActivationCount || 0) + 1;
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'toggle-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    result.current.resetPluginAssets('toggle-plugin');

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'toggle-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect((globalThis as Record<string, unknown>).__useManagerActivationCount).toBe(2);
  });

  it('delivers resolved webview assets to the activated plugin script', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate(api) {
        api.onMessage((message) => {
          const messages = globalThis.__useManagerMessages || (globalThis.__useManagerMessages = []);
          messages.push(message);
        });
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'asset-plugin',
        scripts: [scriptUrl],
        styles: [],
        assets: [{ id: 'fireflies', label: 'Fireflies', url: 'webview://fireflies.js' }],
      });
    });

    expect((globalThis as Record<string, unknown>).__useManagerMessages).toEqual([
      {
        type: 'PLUGIN_WEBVIEW_ASSETS_UPDATED',
        data: [{ id: 'fireflies', label: 'Fireflies', url: 'webview://fireflies.js' }],
      },
    ]);
  });

  it('makes plugin data available to a script on first activation', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate(api) {
        globalThis.__useManagerPluginData = api.getPluginData();
      }
    `);
    const pluginData = {
      enabled: true,
      preset: 'embers',
      intensity: 1,
    };

    result.current.updatePluginData('particle-plugin', pluginData);
    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'particle-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect((globalThis as Record<string, unknown>).__useManagerPluginData).toEqual(pluginData);
  });

  it('disposes plugin activation cleanup when plugin assets are reset', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate() {
        globalThis.__useManagerActivationCount = (globalThis.__useManagerActivationCount || 0) + 1;
        return () => {
          globalThis.__useManagerCleanupCount = (globalThis.__useManagerCleanupCount || 0) + 1;
        };
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'toggle-plugin',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    result.current.resetPluginAssets('toggle-plugin');

    expect((globalThis as Record<string, unknown>).__useManagerActivationCount).toBe(1);
    expect((globalThis as Record<string, unknown>).__useManagerCleanupCount).toBe(1);
  });

  it('replaces an active plugin when its runtime revision changes', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate() {
        globalThis.__useManagerActivationCount = (globalThis.__useManagerActivationCount || 0) + 1;
        return () => {
          globalThis.__useManagerCleanupCount = (globalThis.__useManagerCleanupCount || 0) + 1;
        };
      }
    `);
    const firstInjection = {
      pluginId: 'linked-plugin',
      revision: 'build-v1',
      scripts: [scriptUrl],
      styles: [],
    };
    const replacementInjection = {
      ...firstInjection,
      revision: 'build-v2',
    };

    await act(async () => {
      await result.current.injectPluginAssets(firstInjection);
      await result.current.injectPluginAssets(replacementInjection);
    });

    expect((globalThis as Record<string, unknown>).__useManagerActivationCount).toBe(2);
    expect((globalThis as Record<string, unknown>).__useManagerCleanupCount).toBe(1);
  });

  it('removes host registrations before activating a revised runtime', async () => {
    const { result } = renderHook(() => usePluginManager());
    const scriptUrl = toDataUrlModule(`
      export function activate(api) {
        api.registerNodeRenderer('.ts', () => undefined);
      }
    `);

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'linked-plugin',
        revision: 'build-v1',
        scripts: [scriptUrl],
        styles: [],
      });
      await result.current.injectPluginAssets({
        pluginId: 'linked-plugin',
        revision: 'build-v2',
        scripts: [scriptUrl],
        styles: [],
      });
    });

    expect(result.current.pluginHost.getNodeRenderers('.ts')).toHaveLength(1);
  });

  it('blocks stale registrations from an activation that finishes after reset', async () => {
    const { result } = renderHook(() => usePluginManager());
    let releaseActivation: (() => void) | undefined;
    let markStarted: (() => void) | undefined;
    (globalThis as Record<string, unknown>).__useManagerActivationGate = new Promise<void>((resolve) => {
      releaseActivation = resolve;
    });
    const activationStarted = new Promise<void>((resolve) => {
      markStarted = resolve;
    });
    (globalThis as Record<string, unknown>).__useManagerActivationStarted = markStarted;
    const scriptUrl = toDataUrlModule(`
      export async function activate(api) {
        globalThis.__useManagerActivationStarted();
        await globalThis.__useManagerActivationGate;
        api.registerNodeRenderer('.stale', () => undefined);
      }
    `);

    const activation = result.current.injectPluginAssets({
      pluginId: 'linked-plugin',
      revision: 'build-v1',
      scripts: [scriptUrl],
      styles: [],
    });
    await activationStarted;
    result.current.resetPluginAssets('linked-plugin');
    releaseActivation?.();
    await activation;

    expect(result.current.pluginHost.getNodeRenderers('.stale')).toEqual([]);
  });

  it('does not run later scripts from a payload replaced during activation', async () => {
    const { result } = renderHook(() => usePluginManager());
    let releaseOldActivation: (() => void) | undefined;
    let markOldActivationStarted: (() => void) | undefined;
    (globalThis as Record<string, unknown>).__useManagerOldActivationGate = new Promise<void>(
      (resolve) => {
        releaseOldActivation = resolve;
      },
    );
    const oldActivationStarted = new Promise<void>((resolve) => {
      markOldActivationStarted = resolve;
    });
    (globalThis as Record<string, unknown>).__useManagerOldActivationStarted =
      markOldActivationStarted;
    const blockingScript = toDataUrlModule(`
      export async function activate() {
        globalThis.__useManagerOldActivationStarted();
        await globalThis.__useManagerOldActivationGate;
      }
    `);
    const staleFollowUpScript = toDataUrlModule(`
      export function activate(api) {
        api.registerNodeRenderer('.stale-follow-up', () => undefined);
      }
    `);
    const replacementScript = toDataUrlModule(`
      export function activate(api) {
        api.registerNodeRenderer('.replacement', () => undefined);
      }
    `);

    const oldInjection = result.current.injectPluginAssets({
      pluginId: 'linked-plugin',
      revision: 'build-v1',
      scripts: [blockingScript, staleFollowUpScript],
      styles: [],
    });
    await oldActivationStarted;
    await result.current.injectPluginAssets({
      pluginId: 'linked-plugin',
      revision: 'build-v2',
      scripts: [replacementScript],
      styles: [],
    });
    releaseOldActivation?.();
    await oldInjection;

    expect(result.current.pluginHost.getNodeRenderers('.stale-follow-up')).toEqual([]);
    expect(result.current.pluginHost.getNodeRenderers('.replacement')).toHaveLength(1);
  });

  it('keeps the replacement activation pending when the stale activation finishes', async () => {
    const { result } = renderHook(() => usePluginManager());
    let releaseFirst: (() => void) | undefined;
    let releaseSecond: (() => void) | undefined;
    let markFirstStarted: (() => void) | undefined;
    let markSecondStarted: (() => void) | undefined;
    (globalThis as Record<string, unknown>).__useManagerFirstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    (globalThis as Record<string, unknown>).__useManagerSecondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const firstStarted = new Promise<void>((resolve) => {
      markFirstStarted = resolve;
    });
    const secondStarted = new Promise<void>((resolve) => {
      markSecondStarted = resolve;
    });
    (globalThis as Record<string, unknown>).__useManagerFirstStarted = markFirstStarted;
    (globalThis as Record<string, unknown>).__useManagerSecondStarted = markSecondStarted;
    const scriptUrl = toDataUrlModule(`
      export async function activate() {
        globalThis.__useManagerOverlapCount = (globalThis.__useManagerOverlapCount || 0) + 1;
        if (globalThis.__useManagerOverlapCount === 1) {
          globalThis.__useManagerFirstStarted();
          await globalThis.__useManagerFirstGate;
          return;
        }
        if (globalThis.__useManagerOverlapCount === 2) {
          globalThis.__useManagerSecondStarted();
          await globalThis.__useManagerSecondGate;
        }
      }
    `);
    const injection = {
      pluginId: 'linked-plugin',
      scripts: [scriptUrl],
      styles: [],
    };

    const firstActivation = result.current.injectPluginAssets(injection);
    await firstStarted;
    result.current.resetPluginAssets('linked-plugin');
    const secondActivation = result.current.injectPluginAssets(injection);
    await secondStarted;
    releaseFirst?.();
    await firstActivation;
    const thirdActivation = result.current.injectPluginAssets(injection);
    await Promise.resolve();
    releaseSecond?.();
    await Promise.all([secondActivation, thirdActivation]);

    expect((globalThis as Record<string, unknown>).__useManagerOverlapCount).toBe(2);
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
