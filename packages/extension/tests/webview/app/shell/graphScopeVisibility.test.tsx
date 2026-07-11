import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useDebouncedGraphScopeVisibility,
} from '../../../../src/webview/app/shell/graphScopeVisibility';

describe('useDebouncedGraphScopeVisibility', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 91));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders the first populated graph scope immediately', () => {
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
    expect(requestAnimationFrame).not.toHaveBeenCalled();
  });

  it('keeps the current render visibility until the next animation frame', () => {
    const initialNodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextNodeVisibility = { file: false };
    const finalNodeVisibility = { file: false, 'symbol:function': true };
    const finalEdgeVisibility = { include: false };
    let publishFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      publishFrame = callback;
      return 71;
    }));

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

    act(() => { publishFrame?.(16); });

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
    const initialNodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextNodeVisibility = { file: false };
    let publishFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      publishFrame = callback;
      return 72;
    }));

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

    rerender({
      edgeVisibility: { include: true },
      nodeVisibility: { file: false },
      revision: 21,
    });

    act(() => { publishFrame?.(16); });

    expect(result.current).toEqual({
      revision: 21,
      visibility: {
        edgeVisibility: initialEdgeVisibility,
        nodeVisibility: nextNodeVisibility,
      },
    });
  });

  it('coalesces rapid scope changes into the next animation frame', () => {
    const initialNodeVisibility = { file: true };
    const initialEdgeVisibility = { include: true };
    const nextNodeVisibility = { file: false };
    const finalNodeVisibility = { file: false, 'symbol:function': true };
    let publishFrame: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      publishFrame = callback;
      return 73;
    }));

    const { result, rerender } = renderHook(
      ({ nodeVisibility, revision }) => useDebouncedGraphScopeVisibility(
        nodeVisibility,
        initialEdgeVisibility,
        revision,
      ),
      { initialProps: { nodeVisibility: initialNodeVisibility, revision: 30 } },
    );

    rerender({ nodeVisibility: nextNodeVisibility, revision: 31 });
    rerender({ nodeVisibility: finalNodeVisibility, revision: 32 });
    act(() => { publishFrame?.(16); });

    expect(result.current).toEqual({
      revision: 32,
      visibility: {
        edgeVisibility: initialEdgeVisibility,
        nodeVisibility: finalNodeVisibility,
      },
    });
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
  });

  it('cancels a pending projection when visibility semantically reverts', () => {
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
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    rerender({ nodeVisibility: { file: true }, revision: 42 });

    expect(result.current).toEqual({
      revision: 42,
      visibility: {
        edgeVisibility,
        nodeVisibility: initialNodeVisibility,
      },
    });
    expect(cancelAnimationFrame).toHaveBeenCalledWith(expect.any(Number));
  });

  it('cancels a pending projection when the observer unmounts', () => {
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
    expect(requestAnimationFrame).toHaveBeenCalledOnce();
    unmount();

    expect(cancelAnimationFrame).toHaveBeenCalledWith(expect.any(Number));
  });
});
