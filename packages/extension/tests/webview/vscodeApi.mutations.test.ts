/**
 * Tests targeting surviving mutants in vscodeApi.ts:
 * - L35:50 Survived BlockStatement: {} (getVsCodeApi body returns undefined instead of vscode)
 * - L44:7 Survived ConditionalExpression: true (if (vscode) -> if (true), would throw when null)
 *
 * Note: L26:9 is NoCoverage (catch block) - in test env acquireVsCodeApi never throws.
 * We test the catch path by re-importing the module with a throwing acquireVsCodeApi.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('vscodeApi (mutation targets)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getVsCodeApi returns a truthy object with postMessage method', async () => {
    // L35: if `return vscode` is mutated to `{}` (empty block, returns undefined),
    // this test would fail because undefined is falsy and has no postMessage.
    const { getVsCodeApi } = await import('../../src/webview/vscodeApi');
    const api = getVsCodeApi();

    // Must be truthy (not null, not undefined)
    expect(api).toBeTruthy();
    // Must have the postMessage method from the mock
    expect(api).toHaveProperty('postMessage');
    expect(typeof api!.postMessage).toBe('function');
  });

  it('getVsCodeApi returns the exact same reference on multiple calls', async () => {
    // L35: if body is mutated to return undefined, both calls return undefined
    // which is === but this test combined with the truthy check above catches it.
    const { getVsCodeApi } = await import('../../src/webview/vscodeApi');
    const api1 = getVsCodeApi();
    const api2 = getVsCodeApi();

    expect(api1).toBe(api2);
    expect(api1).not.toBeNull();
    expect(api1).not.toBeUndefined();
  });

  it('postMessage does not throw when vscode API is available', async () => {
    // L44: if `if (vscode)` is mutated to `if (true)`, this still works
    // because vscode IS available in the test env. We need the null case below.
    const { postMessage } = await import('../../src/webview/vscodeApi');

    expect(() => {
      postMessage({ type: 'WEBVIEW_READY', payload: null });
    }).not.toThrow();
  });

  it('postMessage is a no-op when acquireVsCodeApi is not available', async () => {
    // L44: if `if (vscode)` is mutated to `if (true)`, calling vscode.postMessage
    // when vscode is null would throw a TypeError.
    // We simulate this by removing acquireVsCodeApi before importing.
    vi.stubGlobal('acquireVsCodeApi', undefined);

    const { postMessage } = await import('../../src/webview/vscodeApi');

    // Should not throw even though vscode is null
    expect(() => {
      postMessage({ type: 'WEBVIEW_READY', payload: null });
    }).not.toThrow();
  });

  it('getVsCodeApi returns null when acquireVsCodeApi is not available', async () => {
    // L35: if body is mutated to `{}` (returns undefined), this fails
    // because we explicitly check for null (not undefined).
    vi.stubGlobal('acquireVsCodeApi', undefined);

    const { getVsCodeApi } = await import('../../src/webview/vscodeApi');
    const api = getVsCodeApi();

    expect(api).toBeNull();
  });

  it('catch block sets vscode to null when acquireVsCodeApi throws', async () => {
    // L26: if catch block body `vscode = null` is removed,
    // vscode would remain whatever it was before (null from initialization).
    // This test verifies the catch path works correctly.
    vi.stubGlobal('acquireVsCodeApi', () => {
      throw new Error('Already acquired');
    });

    const { getVsCodeApi, postMessage } = await import('../../src/webview/vscodeApi');

    // After the error, getVsCodeApi should return null
    expect(getVsCodeApi()).toBeNull();

    // postMessage should be a no-op (not throw)
    expect(() => {
      postMessage({ type: 'WEBVIEW_READY', payload: null });
    }).not.toThrow();
  });
});
