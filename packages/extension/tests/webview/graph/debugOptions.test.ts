import { describe, expect, it, vi } from 'vitest';
import { buildGraphDebugOptions } from '../../../src/webview/components/graph/debug/options';

describe('graph/debugOptions', () => {
  it('builds debug hook options from graph state and interactions', () => {
    const graphState = {
      containerRef: { current: null },
      fg2dRef: { current: undefined },
      fg3dRef: { current: undefined },
      graphDataRef: { current: { nodes: [] } },
    };
    const fitView = vi.fn();
    const interactions = {
      interactionHandlers: {
        fitView,
      },
    };
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    expect(
      buildGraphDebugOptions({
        graphMode: '3d',
        graphState: graphState as never,
        interactions: interactions as never,
        win,
      }),
    ).toEqual({
      containerRef: graphState.containerRef,
      fitView,
      fg2dRef: graphState.fg2dRef,
      fg3dRef: graphState.fg3dRef,
      graphDataRef: graphState.graphDataRef,
      graphMode: '3d',
      win,
    });
  });
});
