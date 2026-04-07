import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGraphDebugApi } from '../../../src/webview/components/graph/useDebugApi';

type UseDebugApiProps = {
  graphMode: '2d' | '3d';
};

describe('webview/graph/useDebugApi', () => {
  it('does nothing when no window is provided', () => {
    expect(() =>
      renderHook(() =>
        useGraphDebugApi({
          containerRef: { current: null },
          fitView: () => undefined,
          fg2dRef: { current: undefined },
          fg3dRef: { current: undefined },
          graphDataRef: { current: { nodes: [] } },
          graphMode: '2d',
        }),
      ),
    ).not.toThrow();
  });

  it('installs the graph debug api through the hook when a window is provided', () => {
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;

    const { unmount } = renderHook(() =>
      useGraphDebugApi({
        containerRef: { current: null },
        fitView: () => undefined,
        fg2dRef: { current: undefined },
        fg3dRef: { current: undefined },
        graphDataRef: { current: { nodes: [] } },
        graphMode: '2d',
        win,
      }),
    );

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeDefined();
    unmount();
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeUndefined();
  });

  it('reinstalls the debug bridge when tracked inputs change', () => {
    const win = { __CODEGRAPHY_ENABLE_GRAPH_DEBUG__: true } as Window;
    const initialProps: UseDebugApiProps = { graphMode: '2d' };
    const nextProps: UseDebugApiProps = { graphMode: '3d' };
    const { rerender } = renderHook(
      ({ graphMode }: UseDebugApiProps) =>
        useGraphDebugApi({
          containerRef: { current: null },
          fitView: () => undefined,
          fg2dRef: {
            current: {
              graph2ScreenCoords: (x, y) => ({ x, y }),
            },
          },
          fg3dRef: {
            current: {
              graph2ScreenCoords: (x, y, z = 0) => ({ x: x + z, y: y + z }),
            },
          },
          graphDataRef: { current: { nodes: [{ id: 'node', size: 3, x: 1, y: 2, z: 4 }] } },
          graphMode,
          win,
        }),
      {
        initialProps,
      },
    );

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().graphMode).toBe('2d');

    rerender(nextProps);

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot().graphMode).toBe('3d');
  });
});
