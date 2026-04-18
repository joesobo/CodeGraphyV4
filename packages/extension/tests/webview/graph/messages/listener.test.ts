import { describe, expect, it, vi } from 'vitest';
import { createGraphMessageListener } from '../../../../src/webview/components/graph/messages/listener';

describe('graph/messageListener', () => {
  it('builds message effects from the live graph nodes and tooltip path', () => {
    const applyEffects = vi.fn();
    const graphNodesRef = { current: [{ id: 'a.ts', size: 4, x: 12, y: 24 }] };
    const handleMessage = createGraphMessageListener({
      applyEffects,
      graphMode: '2d',
      getGraphNodes: () => graphNodesRef.current,
      tooltipPath: 'a.ts',
    });

    handleMessage({
      data: {
        type: 'FILE_INFO',
        payload: { path: 'a.ts', size: 1, lastModified: '2026-03-15T00:00:00.000Z', pluginName: 'TypeScript' },
      },
    } as never);

    expect(applyEffects).toHaveBeenCalledWith([
      {
        kind: 'cacheFileInfo',
        info: {
          path: 'a.ts',
          size: 1,
          lastModified: '2026-03-15T00:00:00.000Z',
          pluginName: 'TypeScript',
        },
      },
      {
        kind: 'updateTooltipInfo',
        info: {
          path: 'a.ts',
          size: 1,
          lastModified: '2026-03-15T00:00:00.000Z',
          pluginName: 'TypeScript',
        },
      },
    ]);
  });

  it('reads the latest graph nodes from the ref when responding to bounds requests', () => {
    const applyEffects = vi.fn();
    const graphNodesRef = { current: [{ id: 'a.ts', size: 4, x: 12, y: 24 }] };
    const handleMessage = createGraphMessageListener({
      applyEffects,
      graphMode: '3d',
      getGraphNodes: () => graphNodesRef.current,
      tooltipPath: null,
    });

    graphNodesRef.current = [{ id: 'b.ts', size: 8, x: 5, y: 6 }];
    handleMessage({ data: { type: 'GET_NODE_BOUNDS' } } as never);

    expect(applyEffects).toHaveBeenCalledWith([
      {
        kind: 'postMessage',
        message: {
          type: 'NODE_BOUNDS_RESPONSE',
          payload: {
            nodes: [{ id: 'b.ts', x: 5, y: 6, size: 8 }],
          },
        },
      },
    ]);
  });

  it('reads the latest graph mode when responding to runtime-state requests', () => {
    const applyEffects = vi.fn();
    const handleMessage = createGraphMessageListener({
      applyEffects,
      graphMode: '3d',
      getGraphNodes: () => [{ id: 'b.ts', size: 8, x: 5, y: 6 }],
      tooltipPath: null,
    });

    handleMessage({ data: { type: 'GET_GRAPH_RUNTIME_STATE' } } as never);

    expect(applyEffects).toHaveBeenCalledWith([
      {
        kind: 'postMessage',
        message: {
          type: 'GRAPH_RUNTIME_STATE_RESPONSE',
          payload: {
            graphMode: '3d',
            nodeCount: 1,
          },
        },
      },
    ]);
  });
});
