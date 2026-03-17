/**
 * Tests targeting surviving mutants in usePluginManager.ts:
 * - L34:9 ConditionalExpression: false (existing API reuse check)
 * - L38:6 ArrayDeclaration: ["Stryker was here"] (getPluginApi dependency array)
 * - L41:27 StringLiteral: `` (activation key template literal)
 * - L54:6 ArrayDeclaration: [] (activatePluginScript dependency array)
 * - L73:6 ArrayDeclaration: [] (injectPluginAssets dependency array)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePluginManager } from '../../src/webview/usePluginManager';

describe('usePluginManager (mutation targets)', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the same API object for the same pluginId (caches existing)', async () => {
    // This tests L34: `if (existing) return existing;`
    // If the condition were mutated to `false`, every call would create a new API
    const { result } = renderHook(() => usePluginManager());

    // We need to trigger getPluginApi indirectly through activatePluginScript
    // which calls getPluginApi. The dedup check (activatedScriptKeysRef) prevents
    // double activation, so let's inject assets with a script that exports activate.

    // Instead, let's test via the pluginHost.createAPI pattern:
    // The hook exposes pluginHost which has createAPI, but getPluginApi is internal.
    // We can verify the caching behavior by checking that the same pluginHost
    // is returned (which is already tested), but the L34 mutant is about getPluginApi.

    // Since getPluginApi is only called from activatePluginScript, we test that
    // calling injectPluginAssets twice with different scripts for the same plugin
    // passes the same API object to both activate calls.

    // For this, we need a script that records the API it receives.
    const scriptUrl1 = `data:text/javascript,export function activate(api) { globalThis.__api1 = api; }`;
    const scriptUrl2 = `data:text/javascript,export function activate(api) { globalThis.__api2 = api; }`;

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'same-plugin',
        scripts: [scriptUrl1],
        styles: [],
      });
    });

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'same-plugin',
        scripts: [scriptUrl2],
        styles: [],
      });
    });

    // Both scripts for the same pluginId should get the same API object
    const api1 = (globalThis as Record<string, unknown>).__api1;
    const api2 = (globalThis as Record<string, unknown>).__api2;

    expect(api1).toBeDefined();
    expect(api2).toBeDefined();
    expect(api1).toBe(api2);

    // Cleanup
    delete (globalThis as Record<string, unknown>).__api1;
    delete (globalThis as Record<string, unknown>).__api2;
  });

  it('uses pluginId and script in the activation key to prevent duplicate activation', async () => {
    // This tests L41: `const activationKey = \`\${pluginId}::\${script}\`;`
    // If the template literal were mutated to empty string ``, all scripts
    // would share the same key and only the first would activate.

    const scriptUrlA = `data:text/javascript,export function activate(api) { globalThis.__activationCountA = (globalThis.__activationCountA || 0) + 1; }`;
    const scriptUrlB = `data:text/javascript,export function activate(api) { globalThis.__activationCountB = (globalThis.__activationCountB || 0) + 1; }`;

    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [scriptUrlA],
        styles: [],
      });
    });

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [scriptUrlB],
        styles: [],
      });
    });

    // Both scripts should have been activated (different activation keys)
    const countA = (globalThis as Record<string, unknown>).__activationCountA as number;
    const countB = (globalThis as Record<string, unknown>).__activationCountB as number;

    expect(countA).toBe(1);
    expect(countB).toBe(1);

    // Cleanup
    delete (globalThis as Record<string, unknown>).__activationCountA;
    delete (globalThis as Record<string, unknown>).__activationCountB;
  });

  it('does not re-inject styles already loaded', async () => {
    // Tests the style injection loop dedup - injectPluginAssets callback stability
    const { result } = renderHook(() => usePluginManager());

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/one.css', 'https://example.com/two.css'],
      });
    });

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [],
        styles: ['https://example.com/one.css', 'https://example.com/three.css'],
      });
    });

    const links = document.head.querySelectorAll('link[rel="stylesheet"]');
    expect(links).toHaveLength(3); // one, two, three — one is not duplicated
  });

  it('injectPluginAssets remains stable across re-renders', () => {
    // This tests L73: dependency array of injectPluginAssets useCallback
    const { result, rerender } = renderHook(() => usePluginManager());

    const firstRef = result.current.injectPluginAssets;
    rerender();
    rerender();

    expect(result.current.injectPluginAssets).toBe(firstRef);
  });

  it('warns when script has no activate export', async () => {
    // Tests L47-49: the warning for scripts without activate
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => usePluginManager());

    const noActivateScript = `data:text/javascript,export const version = 1;`;

    await act(async () => {
      await result.current.injectPluginAssets({
        pluginId: 'test-plugin',
        scripts: [noActivateScript],
        styles: [],
      });
    });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('has no activate(api) export'),
    );
    warnSpy.mockRestore();
  });
});
