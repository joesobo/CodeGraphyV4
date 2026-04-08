import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness, deferredPromise } from './testHarness';

describe('GraphViewProvider plugin bridge lifecycle', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('fires onWebviewReady once even if WEBVIEW_READY is received multiple times', async () => {
    const onWebviewReady = vi.fn();
    const { getMessageHandler } = harness.createResolvedWebview();

    harness.provider.registerExternalPlugin({
      id: 'test.webview-ready-once',
      name: 'Webview Ready Once',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
      onWebviewReady,
    });

    const handler = getMessageHandler();
    await handler({ type: 'WEBVIEW_READY', payload: null });
    await handler({ type: 'WEBVIEW_READY', payload: null });

    expect(onWebviewReady).toHaveBeenCalledTimes(1);
  });

  it('calls onWorkspaceReady before onWebviewReady on initial load', async () => {
    const onWorkspaceReady = vi.fn();
    const onWebviewReady = vi.fn();
    const { getMessageHandler } = harness.createResolvedWebview();

    harness.provider.registerExternalPlugin({
      id: 'test.initial-order',
      name: 'Initial Order',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
      onWorkspaceReady,
      onWebviewReady,
    });

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(onWorkspaceReady).toHaveBeenCalled();
    expect(onWebviewReady).toHaveBeenCalled();
  });

  it('keeps workspace->webview lifecycle order for plugins registered during first analysis', async () => {
    const onWorkspaceReady = vi.fn();
    const onWebviewReady = vi.fn();
    const deferred = deferredPromise<{ nodes: never[]; edges: never[] }>();
    let analyzeCalls = 0;

    const analyzer = (harness.provider as unknown as {
      _analyzer: { analyze: (signal?: AbortSignal) => Promise<{ nodes: never[]; edges: never[] }> };
    })._analyzer;
    vi.spyOn(analyzer, 'analyze').mockImplementation(async () => {
      analyzeCalls += 1;
      if (analyzeCalls === 1) {
        return deferred.promise;
      }
      return { nodes: [], edges: [] };
    });
    const { getMessageHandler } = harness.createResolvedWebview();

    const readyPromise = getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 0));

    harness.provider.registerExternalPlugin({
      id: 'test.mid-first-analysis',
      name: 'Mid First Analysis',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
      onWorkspaceReady,
      onWebviewReady,
    });

    deferred.resolve({ nodes: [], edges: [] });
    await readyPromise;
    await new Promise(resolve => setTimeout(resolve, 20));

    expect(onWorkspaceReady).toHaveBeenCalled();
    expect(onWebviewReady).toHaveBeenCalled();
  });

  it('replays workspace->webview lifecycle order for plugins registered after both phases', async () => {
    const onWorkspaceReady = vi.fn();
    const onWebviewReady = vi.fn();
    const { getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    harness.provider.registerExternalPlugin({
      id: 'test.late-both-order',
      name: 'Late Both Order',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
      onWorkspaceReady,
      onWebviewReady,
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(onWorkspaceReady).toHaveBeenCalledTimes(1);
    expect(onWebviewReady).toHaveBeenCalled();
  });

  it('replays late onWebviewReady after Tier-2 injection dispatch', async () => {
    const onWebviewReady = vi.fn();
    const initialize = vi.fn().mockResolvedValue(undefined);
    const { mockWebview, getMessageHandler } = harness.createResolvedWebview();

    await getMessageHandler()({ type: 'WEBVIEW_READY', payload: null });
    await new Promise(resolve => setTimeout(resolve, 20));

    mockWebview.postMessage.mockClear();

    harness.provider.registerExternalPlugin({
      id: 'test.late-webview-order',
      name: 'Late Webview Order',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
      initialize,
      onWebviewReady,
      webviewContributions: {
        scripts: ['dist/webview/plugins/late-order.js'],
      },
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    const postedMessages = mockWebview.postMessage.mock.calls.map(
      (call: unknown[]) => call[0] as { type?: string; payload?: { pluginId?: string } },
    );
    const firstInjectIndex = postedMessages.findIndex(
      (message) =>
        message.type === 'PLUGIN_WEBVIEW_INJECT' &&
        message.payload?.pluginId === 'test.late-webview-order',
    );
    expect(firstInjectIndex).toBeGreaterThanOrEqual(0);

    const injectOrder = mockWebview.postMessage.mock.invocationCallOrder[firstInjectIndex];
    expect(onWebviewReady).toHaveBeenCalledTimes(1);
    const onWebviewReadyOrder = onWebviewReady.mock.invocationCallOrder[0];
    expect(injectOrder).toBeLessThan(onWebviewReadyOrder);
    expect(initialize).toHaveBeenCalledTimes(1);
  });
});
