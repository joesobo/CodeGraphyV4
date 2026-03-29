import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createGraphViewProviderTestHarness } from './testHarness';

describe('GraphViewProvider plugin bridge dispatch', () => {
  let harness = createGraphViewProviderTestHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    harness = createGraphViewProviderTestHarness();
  });

  it('routes plugin-scoped GRAPH_INTERACTION messages to onWebviewMessage handlers', async () => {
    const pluginWebviewHandler = vi.fn();
    const { getMessageHandler } = harness.createResolvedWebview();

    harness.provider.registerExternalPlugin({
      id: 'test.plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      apiVersion: '^2.0.0',
      supportedExtensions: ['.ts'],
      detectConnections: async () => [],
      onLoad: (api: { onWebviewMessage: (handler: (msg: { type: string; data: unknown }) => void) => void }) => {
        api.onWebviewMessage(pluginWebviewHandler);
      },
    });

    await getMessageHandler()({
      type: 'GRAPH_INTERACTION',
      payload: {
        event: 'plugin:test.plugin:ping',
        data: { ok: true },
      },
    });

    expect(pluginWebviewHandler).toHaveBeenCalledWith({ type: 'ping', data: { ok: true } });
  });
});
