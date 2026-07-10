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

  it('renders the first populated graph scope immediately', () => {
    vi.useFakeTimers();
    const initialNodeVisibility = {};
    const initialEdgeVisibility = {};
    const nextNodeVisibility = { file: true };
    const nextEdgeVisibility = { include: true };

    const { result, rerender } = renderHook(
      ({ nodeVisibility, edgeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
        revision,
      ),
      {
        initialProps: {
          edgeVisibility: initialEdgeVisibility,
          nodeVisibility: initialNodeVisibility,
          revision: 0,
        },
      },
    );

    rerender({
      edgeVisibility: nextEdgeVisibility,
      nodeVisibility: nextNodeVisibility,
      revision: 1,
    });

    expect(result.current).toEqual({
      revision: 1,
      visibility: {
        edgeVisibility: nextEdgeVisibility,
        nodeVisibility: nextNodeVisibility,
      },
    });
  });

  it('renders edge-only graph scope changes immediately', () => {
    vi.useFakeTimers();
    const nodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextEdgeVisibility = { include: false };

    const { result, rerender } = renderHook(
      ({ edgeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
        revision,
      ),
      {
        initialProps: {
          edgeVisibility: initialEdgeVisibility,
          revision: 4,
        },
      },
    );

    rerender({ edgeVisibility: nextEdgeVisibility, revision: 5 });

    expect(result.current).toEqual({
      revision: 5,
      visibility: {
        edgeVisibility: nextEdgeVisibility,
        nodeVisibility,
      },
    });
  });

  it('renders a revision-only projection update immediately', () => {
    vi.useFakeTimers();
    const nodeVisibility = { file: true };
    const edgeVisibility = { include: true };
    const { result, rerender } = renderHook(
      ({ revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
        revision,
      ),
      { initialProps: { revision: 5 } },
    );

    rerender({ revision: 6 });

    expect(result.current).toEqual({
      revision: 6,
      visibility: { edgeVisibility, nodeVisibility },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('keeps the current render visibility until rapid graph scope changes settle', () => {
    vi.useFakeTimers();
    const initialNodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextNodeVisibility = { file: false };
    const finalNodeVisibility = { file: false, 'symbol:function': true };
    const finalEdgeVisibility = { include: false };

    const { result, rerender } = renderHook(
      ({ nodeVisibility, edgeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
        revision,
      ),
      {
        initialProps: {
          edgeVisibility: initialEdgeVisibility,
          nodeVisibility: initialNodeVisibility,
          revision: 10,
        },
      },
    );

    expect(result.current).toEqual({
      revision: 10,
      visibility: {
        edgeVisibility: initialEdgeVisibility,
        nodeVisibility: initialNodeVisibility,
      },
    });
    const initialProjectionRevision = result.current;

    rerender({
      edgeVisibility: initialEdgeVisibility,
      nodeVisibility: nextNodeVisibility,
      revision: 11,
    });

    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS - 1);
    });

    expect(result.current).toEqual({
      revision: 10,
      visibility: {
        edgeVisibility: initialEdgeVisibility,
        nodeVisibility: initialNodeVisibility,
      },
    });
    expect(result.current).toBe(initialProjectionRevision);

    rerender({
      edgeVisibility: finalEdgeVisibility,
      nodeVisibility: finalNodeVisibility,
      revision: 12,
    });

    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS);
    });

    expect(result.current).toEqual({
      revision: 12,
      visibility: {
        edgeVisibility: finalEdgeVisibility,
        nodeVisibility: finalNodeVisibility,
      },
    });
    expect(result.current).not.toBe(initialProjectionRevision);
  });

  it('does not restart a pending projection for an equivalent visibility echo', () => {
    vi.useFakeTimers();
    const initialNodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextNodeVisibility = { file: false };

    const { result, rerender } = renderHook(
      ({ nodeVisibility, edgeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
        revision,
      ),
      {
        initialProps: {
          edgeVisibility: initialEdgeVisibility,
          nodeVisibility: initialNodeVisibility,
          revision: 20,
        },
      },
    );

    rerender({
      edgeVisibility: initialEdgeVisibility,
      nodeVisibility: nextNodeVisibility,
      revision: 21,
    });

    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS / 2);
    });

    rerender({
      edgeVisibility: { include: true },
      nodeVisibility: { file: false },
      revision: 21,
    });

    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS / 2);
    });

    expect(result.current).toEqual({
      revision: 21,
      visibility: {
        edgeVisibility: initialEdgeVisibility,
        nodeVisibility: nextNodeVisibility,
      },
    });
  });

  it('coalesces rapid scope changes into the original render deadline', () => {
    vi.useFakeTimers();
    const initialNodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextNodeVisibility = { file: false };
    const finalNodeVisibility = { file: false, 'symbol:function': true };

    const { result, rerender } = renderHook(
      ({ nodeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        initialEdgeVisibility,
        revision,
      ),
      { initialProps: { nodeVisibility: initialNodeVisibility, revision: 30 } },
    );

    rerender({ nodeVisibility: nextNodeVisibility, revision: 31 });
    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS / 2);
    });
    rerender({ nodeVisibility: finalNodeVisibility, revision: 32 });
    act(() => {
      vi.advanceTimersByTime(GRAPH_SCOPE_RENDER_DEBOUNCE_MS / 2);
    });

    expect(result.current).toEqual({
      revision: 32,
      visibility: {
        edgeVisibility: initialEdgeVisibility,
        nodeVisibility: finalNodeVisibility,
      },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a pending projection when visibility semantically reverts', () => {
    vi.useFakeTimers();
    const initialNodeVisibility = { file: true };
    const edgeVisibility = { include: true };
    const { result, rerender } = renderHook(
      ({ nodeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
        revision,
      ),
      { initialProps: { nodeVisibility: initialNodeVisibility, revision: 40 } },
    );

    rerender({ nodeVisibility: { file: false }, revision: 41 });
    expect(vi.getTimerCount()).toBe(1);
    rerender({ nodeVisibility: { file: true }, revision: 42 });

    expect(result.current).toEqual({
      revision: 42,
      visibility: {
        edgeVisibility,
        nodeVisibility: initialNodeVisibility,
      },
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels a pending projection when the observer unmounts', () => {
    vi.useFakeTimers();
    const edgeVisibility = { include: true };
    const { rerender, unmount } = renderHook(
      ({ nodeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        edgeVisibility,
        revision,
      ),
      { initialProps: { nodeVisibility: { file: true }, revision: 50 } },
    );

    rerender({ nodeVisibility: { file: false }, revision: 51 });
    expect(vi.getTimerCount()).toBe(1);
    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
