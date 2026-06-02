import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

const responseHarness = vi.hoisted(() => ({
  postMessage: vi.fn(),
}));

vi.mock('../../../../src/webview/vscodeApi', () => ({
  postMessage: responseHarness.postMessage,
}));

import {
  createVisibleGraphStatePayload,
  isVisibleGraphStateRequest,
  useVisibleGraphStateResponse,
} from '../../../../src/webview/app/shell/visibleGraphResponse';

const graphData: IGraphData = {
  nodes: [
    { id: 'a.ts', label: 'a.ts', color: '#3B82F6' },
  ],
  edges: [
    { id: 'a->b', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
  ],
};

describe('webview/app/shell/visibleGraphResponse', () => {
  afterEach(() => {
    responseHarness.postMessage.mockClear();
  });

  it('creates a zero payload when graph data is unavailable', () => {
    expect(createVisibleGraphStatePayload(null)).toEqual({
      edgeCount: 0,
      edgeIds: [],
      nodeCount: 0,
      nodes: [],
    });
  });

  it('creates a payload from the supplied graph data', () => {
    expect(createVisibleGraphStatePayload(graphData)).toEqual({
      edgeCount: 1,
      edgeIds: ['a->b'],
      nodeCount: 1,
      nodes: [{ id: 'a.ts', nodeType: undefined, color: '#3B82F6' }],
    });
  });

  it('recognizes only visible graph state requests', () => {
    expect(isVisibleGraphStateRequest({ type: 'GET_VISIBLE_GRAPH_STATE' })).toBe(true);
    expect(isVisibleGraphStateRequest({ type: 'OTHER' })).toBe(false);
    expect(isVisibleGraphStateRequest(null)).toBe(false);
  });

  it('responds to requests and removes the listener on unmount', () => {
    const { unmount } = renderHook(() => useVisibleGraphStateResponse(graphData));

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'OTHER' } }));
    expect(responseHarness.postMessage).not.toHaveBeenCalled();

    window.dispatchEvent(new MessageEvent('message', { data: { type: 'GET_VISIBLE_GRAPH_STATE' } }));
    expect(responseHarness.postMessage).toHaveBeenCalledWith({
      type: 'VISIBLE_GRAPH_STATE_RESPONSE',
      payload: {
        edgeCount: 1,
        edgeIds: ['a->b'],
        nodeCount: 1,
        nodes: [{ id: 'a.ts', nodeType: undefined, color: '#3B82F6' }],
      },
    });

    responseHarness.postMessage.mockClear();
    unmount();
    window.dispatchEvent(new MessageEvent('message', { data: { type: 'GET_VISIBLE_GRAPH_STATE' } }));
    expect(responseHarness.postMessage).not.toHaveBeenCalled();
  });
});
