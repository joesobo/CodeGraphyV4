import { describe, expect, it, vi } from 'vitest';
import { buildGraphDebugOptions } from '../../../../src/webview/components/graph/debug/options';

describe('graph/debugOptions', () => {
  it('builds debug hook options from graph state and interactions', () => {
    const graphState = {
      renderer: {
        containerRef: { current: null },
        fg2dRef: { current: undefined },
        graphDataRef: { current: { nodes: [] } },
      },
    };
    const fitView = vi.fn();
    const openNodeContextMenu = vi.fn();
    const interactions = {
      handleNodeContextMenuById: openNodeContextMenu,
      interactionHandlers: {
        fitView,
      },
    };
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    expect(
      buildGraphDebugOptions({
        graphState: graphState as never,
        interactions: interactions as never,
        win,
      }),
    ).toEqual({
      containerRef: graphState.renderer.containerRef,
      fitView,
      fg2dRef: graphState.renderer.fg2dRef,
      graphDataRef: graphState.renderer.graphDataRef,
      openNodeContextMenu,
      win,
    });
  });
});
