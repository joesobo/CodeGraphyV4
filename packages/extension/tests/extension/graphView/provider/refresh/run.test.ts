import { describe, expect, it, vi } from 'vitest';

import {
  runIndexRefresh,
  runPrimaryRefresh,
  sendRefreshState,
} from '../../../../../src/extension/graphView/provider/refresh/run';

function createSource(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _sendAllSettings: vi.fn(),
    _sendGraphControls: vi.fn(),
    _sendMessage: vi.fn(),
    _sendFavorites: vi.fn(),
    _loadAndSendData: vi.fn(async () => undefined),
    _refreshAndSendData: vi.fn(async () => undefined),
    _rawGraphData: { nodes: [], edges: [] },
    _graphData: { nodes: [], edges: [] },
    _analyzer: {
      hasIndex: vi.fn(() => true),
      getIndexStatus: vi.fn(() => ({
        freshness: 'fresh',
        detail: 'CodeGraphy index is fresh.',
      })),
    },
    ...overrides,
  };
}

describe('graphView/provider/refresh/run', () => {
  it('sends refresh state even when graph controls are unavailable', () => {
    const source = createSource({ _sendGraphControls: undefined });

    expect(() => sendRefreshState(source as never)).not.toThrow();
    expect(source._sendAllSettings).toHaveBeenCalledOnce();
    expect(source._sendFavorites).not.toHaveBeenCalled();
  });

  it('republishes the current index status after a scoped refresh', () => {
    const source = createSource();

    sendRefreshState(source as never);

    expect(source._sendMessage).toHaveBeenCalledWith({
      type: 'GRAPH_INDEX_STATUS_UPDATED',
      payload: {
        hasIndex: true,
        freshness: 'fresh',
        detail: 'CodeGraphy index is fresh.',
      },
    });
  });

  it('uses the cache-only helper for a primary refresh', async () => {
    const source = createSource();

    await runPrimaryRefresh(source as never);

    expect(source._loadAndSendData).toHaveBeenCalledOnce();
  });

  it('uses the index refresh helper when it is available', async () => {
    const source = createSource();

    await runIndexRefresh(source as never);

    expect(source._refreshAndSendData).toHaveBeenCalledOnce();
  });
});
