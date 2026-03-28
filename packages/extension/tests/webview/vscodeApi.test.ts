import { describe, it, expect, beforeEach } from 'vitest';
import { getVsCodeApi, postMessage } from '../../src/webview/vscodeApi';

describe('vscodeApi', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages = (globalThis as any).__vscodeSentMessages as Array<{ type?: string }>;
    sentMessages.length = 0;
  });

  it('returns a non-null API when acquireVsCodeApi is available', () => {
    const api = getVsCodeApi();
    // In the test environment, acquireVsCodeApi is mocked in setup.ts
    expect(api).not.toBeNull();
  });

  it('postMessage sends a message through the vscode API', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages = (globalThis as any).__vscodeSentMessages as Array<{ type?: string }>;

    postMessage({ type: 'WEBVIEW_READY', payload: null });

    expect(sentMessages).toContainEqual({ type: 'WEBVIEW_READY', payload: null });
  });

  it('postMessage sends different message types correctly', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sentMessages = (globalThis as any).__vscodeSentMessages as Array<{ type?: string }>;

    postMessage({ type: 'NODE_SELECTED', payload: { nodeId: 'test.ts' } });

    expect(sentMessages).toContainEqual({
      type: 'NODE_SELECTED',
      payload: { nodeId: 'test.ts' },
    });
  });

  it('getVsCodeApi returns the same instance across calls', () => {
    const api1 = getVsCodeApi();
    const api2 = getVsCodeApi();
    expect(api1).toBe(api2);
  });
});
