import { beforeEach, describe, expect, it, vi } from 'vitest';

import { graphStore } from '../../../src/webview/store/state';
import {
  applyGraphScopeVisibility,
  getGraphScopeInventory,
  getGraphScopeProjectionRevision,
} from '../../../src/webview/components/graphScope/visibility';
import {
  flushGraphScopeVisibilityMessages,
  resetGraphScopeVisibilityMessageQueueForTests,
} from '../../../src/webview/components/graphScope/messages';

const sentMessages: unknown[] = [];

vi.mock('../../../src/webview/vscodeApi', () => ({
  postMessage: (message: unknown) => sentMessages.push(message),
}));

describe('graph scope visibility', () => {
  beforeEach(() => {
    sentMessages.length = 0;
    resetGraphScopeVisibilityMessageQueueForTests();
    graphStore.setState({
      graphHasIndex: true,
      graphNodeTypes: [
        { id: 'symbol', label: 'Symbols', defaultColor: '#111', defaultVisible: false },
        {
          id: 'symbol:function',
          label: 'Functions',
          defaultColor: '#222',
          defaultVisible: false,
          parentId: 'symbol',
        },
        { id: 'file', label: 'Files', defaultColor: '#333', defaultVisible: true },
      ],
      graphEdgeTypes: [
        { id: 'reference', label: 'References', defaultColor: '#444', defaultVisible: true },
        {
          id: 'overrides',
          label: 'Overrides',
          defaultColor: '#555',
          defaultVisible: false,
          requiresEdgeType: 'reference',
        },
      ],
      graphScopeProjectionRevision: 0,
      nodeVisibility: { symbol: false, folder: true },
      edgeVisibility: { reference: true },
    });
  });

  it('inventories actual node and available edge rows in deterministic order', () => {
    expect(getGraphScopeInventory()).toEqual([
      { scopeKind: 'node', scopeId: 'file', enabled: true },
      { scopeKind: 'node', scopeId: 'symbol', enabled: false },
      { scopeKind: 'node', scopeId: 'symbol:function', enabled: false },
      { scopeKind: 'edge', scopeId: 'overrides', enabled: false },
      { scopeKind: 'edge', scopeId: 'reference', enabled: true },
    ]);
  });

  it('uses the row production path including optimistic parent enablement and persistence queue', () => {
    const onPosted = vi.fn();

    expect(applyGraphScopeVisibility({
      scopeKind: 'node',
      scopeId: 'symbol:function',
      enabled: true,
    }, onPosted)).toBe(true);

    expect(graphStore.getState().nodeVisibility).toMatchObject({
      symbol: true,
      'symbol:function': true,
    });
    expect(graphStore.getState().graphScopeProjectionRevision).toBe(1);
    expect(getGraphScopeProjectionRevision()).toBe(1);
    expect(onPosted).not.toHaveBeenCalled();

    flushGraphScopeVisibilityMessages();

    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { nodeVisibility: { 'symbol:function': true } },
    });
    expect(onPosted).toHaveBeenCalledOnce();
  });

  it('advances the projection revision for an edge toggle', () => {
    expect(applyGraphScopeVisibility({
      scopeKind: 'edge',
      scopeId: 'reference',
      enabled: false,
    })).toBe(true);

    expect(graphStore.getState().edgeVisibility).toMatchObject({ reference: false });
    expect(getGraphScopeProjectionRevision()).toBe(1);

    flushGraphScopeVisibilityMessages();
    expect(sentMessages).toContainEqual({
      type: 'UPDATE_GRAPH_CONTROL_VISIBILITY_BATCH',
      payload: { edgeVisibility: { reference: false } },
    });
  });

  it('rejects a toggle for a row that is not currently available', () => {
    graphStore.setState({ edgeVisibility: { reference: false } });

    expect(applyGraphScopeVisibility({
      scopeKind: 'edge',
      scopeId: 'overrides',
      enabled: true,
    })).toBe(false);
    expect(graphStore.getState().graphScopeProjectionRevision).toBe(0);
    expect(sentMessages).toEqual([]);
  });
});
