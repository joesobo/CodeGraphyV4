import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useGraphDebugApi } from '../../../../src/webview/components/graph/debug/api';

describe('webview/graph/useDebugApi', () => {
  it('does nothing when no window is provided', () => {
    expect(() =>
      renderHook(() =>
        useGraphDebugApi({
          containerRef: { current: null },
          fitView: () => undefined,
          fg2dRef: { current: undefined },
          graphDataRef: { current: { nodes: [] } },
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
        graphDataRef: { current: { nodes: [] } },
        win,
      }),
    );

    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeDefined();
    unmount();
    expect(win.__CODEGRAPHY_GRAPH_DEBUG__).toBeUndefined();
  });

});
