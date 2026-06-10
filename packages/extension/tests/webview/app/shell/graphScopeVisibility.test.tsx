import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  GRAPH_SCOPE_RENDER_DEBOUNCE_MS,
  useDebouncedGraphScopeVisibility,
} from '../../../../src/webview/app/shell/graphScopeVisibility';

describe('useDebouncedGraphScopeVisibility', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the current render visibility until rapid graph scope changes settle', () => {
    vi.useFakeTimers();
    const initialNodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextNodeVisibility = { file: false };
    const finalNodeVisibility = { file: false, 'symbol:function': true };
    const finalEdgeVisibility = { include: false };

    const { result, rerender } = renderHook(
      ({ nodeVisibility, edgeVisibility }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
      ),
      {
        initialProps: {
          edgeVisibility: initialEdgeVisibility,
          nodeVisibility: initialNodeVisibility,
        },
      },
    );

    expect(result.current).toEqual({
      edgeVisibility: initialEdgeVisibility,
      nodeVisibility: initialNodeVisibility,
    });

    rerender({
      edgeVisibility: initialEdgeVisibility,
      nodeVisibility: nextNodeVisibility,
    });

    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS - 1);
    });

    expect(result.current).toEqual({
      edgeVisibility: initialEdgeVisibility,
      nodeVisibility: initialNodeVisibility,
    });

    rerender({
      edgeVisibility: finalEdgeVisibility,
      nodeVisibility: finalNodeVisibility,
    });

    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS);
    });

    expect(result.current).toEqual({
      edgeVisibility: finalEdgeVisibility,
      nodeVisibility: finalNodeVisibility,
    });
  });
});
