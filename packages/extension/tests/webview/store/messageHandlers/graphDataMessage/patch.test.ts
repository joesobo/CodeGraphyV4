import { describe, expect, it, vi } from 'vitest';
import { handleGraphDataPatched } from '../../../../../src/webview/store/messageHandlers/graphDataMessage/patch';
import { createState } from '../graph/fixture';

function patchMessage() {
  return {
    type: 'GRAPH_DATA_PATCHED' as const,
    baseGraphRevision: 0,
    graphRevision: 1,
    nodeCount: 3,
    edgeCount: 0,
    payload: {
      addedNodes: [{ id: 'src/add.ts', label: 'add.ts', color: '#111111' }],
      removedNodeIds: ['src/remove.ts'],
      updatedNodes: [{ id: 'src/update.ts', label: 'updated.ts', color: '#ffffff' }],
      addedLinks: [],
      removedLinkIds: [],
    },
  };
}

describe('webview/store/messageHandlers/graphDataMessage/patch', () => {
  it('applies graph patches in place and returns a new graph root', () => {
    const retained = { id: 'src/keep.ts', label: 'keep.ts', color: '#111111' };
    const updated = { id: 'src/update.ts', label: 'update.ts', color: '#111111' };
    const graphData = {
      nodes: [retained, updated, { id: 'src/remove.ts', label: 'remove.ts', color: '#111111' }],
      edges: [],
    };
    const state = createState({ graphData, graphRevision: 0, graphIsIndexing: true });

    const result = handleGraphDataPatched(patchMessage(), { getState: () => state });

    expect(result).toMatchObject({
      graphIsIndexing: false,
      graphIndexProgress: null,
      graphRevision: 1,
      isLoading: false,
    });
    expect(result?.graphData).not.toBe(graphData);
    expect(result?.graphData?.nodes.map(node => node.id)).toEqual([
      'src/keep.ts',
      'src/update.ts',
      'src/add.ts',
    ]);
    expect(result?.graphData?.nodes[0]).toBe(retained);
    expect(result?.graphData?.nodes[1]).toBe(updated);
    expect(updated.label).toBe('updated.ts');
  });

  it('ignores patches when no base graph exists', () => {
    const postMessage = vi.fn();
    expect(handleGraphDataPatched(
      patchMessage(),
      { getState: () => createState({ graphData: null, graphRevision: 0 }), postMessage },
    )).toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith({ type: 'REQUEST_GRAPH_DATA', payload: null });
  });

  it('requests a full replay when the patch base revision is stale', () => {
    const postMessage = vi.fn();
    const state = createState({
      graphRevision: 5,
      graphData: {
        nodes: [{ id: 'src/update.ts', label: 'update.ts', color: '#111111' }],
        edges: [],
      },
    });

    expect(handleGraphDataPatched(
      patchMessage(),
      { getState: () => state, postMessage },
    )).toBeUndefined();
    expect(postMessage).toHaveBeenCalledWith({ type: 'REQUEST_GRAPH_DATA', payload: null });
    expect(state.graphData?.nodes).toEqual([
      { id: 'src/update.ts', label: 'update.ts', color: '#111111' },
    ]);
  });

  it('ignores malformed patches without mutating the base graph', () => {
    const graphData = {
      nodes: [{ id: 'src/keep.ts', label: 'keep.ts', color: '#111111' }],
      edges: [],
    };
    const state = createState({ graphData, graphRevision: 0 });
    const message = patchMessage();
    message.payload.updatedNodes = [
      { id: 'src/missing.ts', label: 'missing.ts', color: '#ffffff' },
    ];

    expect(handleGraphDataPatched(message, { getState: () => state })).toBeUndefined();
    expect(graphData.nodes).toEqual([
      { id: 'src/keep.ts', label: 'keep.ts', color: '#111111' },
    ]);
  });

  it('records patch payload bytes', () => {
    const emitPayloadBytes = vi.fn();
    const state = createState({
      graphRevision: 0,
      graphData: {
        nodes: [
          { id: 'src/update.ts', label: 'update.ts', color: '#111111' },
          { id: 'src/remove.ts', label: 'remove.ts', color: '#111111' },
        ],
        edges: [],
      },
    });
    const message = patchMessage();

    handleGraphDataPatched(message, { getState: () => state }, emitPayloadBytes);

    expect(emitPayloadBytes).toHaveBeenCalledWith(message.payload);
  });
});
