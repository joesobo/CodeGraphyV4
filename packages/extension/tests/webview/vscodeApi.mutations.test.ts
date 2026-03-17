/**
 * Tests targeting mutation coverage in vscodeApi.ts.
 * The module-level try/catch around acquireVsCodeApi() handles missing/throwing environments.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('vscodeApi (mutation targets)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getVsCodeApi returns a truthy object with postMessage method', async () => {
    const { getVsCodeApi } = await import('../../src/webview/vscodeApi');
    const api = getVsCodeApi();

    expect(api).toBeTruthy();
    expect(api).toHaveProperty('postMessage');
    expect(typeof api!.postMessage).toBe('function');
  });

  it('getVsCodeApi returns the exact same reference on multiple calls', async () => {
    const { getVsCodeApi } = await import('../../src/webview/vscodeApi');
    const api1 = getVsCodeApi();
    const api2 = getVsCodeApi();

    expect(api1).toBe(api2);
    expect(api1).not.toBeNull();
    expect(api1).not.toBeUndefined();
  });

  it('postMessage does not throw when vscode API is available', async () => {
    const { postMessage } = await import('../../src/webview/vscodeApi');

    expect(() => {
      postMessage({ type: 'WEBVIEW_READY', payload: null });
    }).not.toThrow();
  });

  it('postMessage is a no-op when acquireVsCodeApi throws', async () => {
    vi.stubGlobal('acquireVsCodeApi', () => {
      throw new Error('Already acquired');
    });

    const { postMessage } = await import('../../src/webview/vscodeApi');

    expect(() => {
      postMessage({ type: 'WEBVIEW_READY', payload: null });
    }).not.toThrow();
  });

  it('getVsCodeApi returns null when acquireVsCodeApi throws', async () => {
    vi.stubGlobal('acquireVsCodeApi', () => {
      throw new Error('Already acquired');
    });

    const { getVsCodeApi, postMessage } = await import('../../src/webview/vscodeApi');

    expect(getVsCodeApi()).toBeNull();

    expect(() => {
      postMessage({ type: 'WEBVIEW_READY', payload: null });
    }).not.toThrow();
  });
});
