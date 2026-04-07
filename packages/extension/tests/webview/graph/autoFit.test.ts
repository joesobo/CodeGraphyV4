import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  resetPendingAutoFit,
  runAutoFitEngineStop,
  schedulePending3dAutoFit,
  useGraphAutoFit,
} from '../../../src/webview/components/graph/autoFit';

describe('webview/graph/autoFit', () => {
  it('resets pending auto-fit on demand', () => {
    const pendingAutoFitRef = { current: false };

    resetPendingAutoFit(pendingAutoFitRef);

    expect(pendingAutoFitRef.current).toBe(true);
  });

  it('schedules a one-shot 3d auto-fit when the graph is ready', () => {
    vi.useFakeTimers();
    const fitView = vi.fn();
    const pendingAutoFitRef = { current: true };

    const cleanup = schedulePending3dAutoFit({
      fitView,
      graphReady: true,
      graphMode: '3d',
      pendingAutoFitRef,
    });

    vi.runAllTimers();

    expect(fitView).toHaveBeenCalledOnce();
    expect(pendingAutoFitRef.current).toBe(false);
    cleanup?.();
    vi.useRealTimers();
  });

  it('fits once on engine stop before delegating the stop handler', () => {
    const fitView = vi.fn();
    const handleEngineStop = vi.fn();
    const pendingAutoFitRef = { current: true };

    runAutoFitEngineStop({
      fitView,
      handleEngineStop,
      pendingAutoFitRef,
    });

    expect(fitView).toHaveBeenCalledOnce();
    expect(handleEngineStop).toHaveBeenCalledOnce();
    expect(pendingAutoFitRef.current).toBe(false);
  });

  it('manages pending auto-fit across graph changes and engine stop', () => {
    vi.useFakeTimers();
    const fitView = vi.fn();
    const handleEngineStop = vi.fn();
    const initialGraphData: { nodes: Array<{ id?: string }> } = { nodes: [] };
    const nextGraphData: { nodes: Array<{ id?: string }> } = { nodes: [{ id: 'a.ts' }] };

    const { rerender, result } = renderHook(
      ({ graphData, graphMode, graphReady }) =>
        useGraphAutoFit({
          fitView,
          graphData,
          graphMode,
          graphReady,
          handleEngineStop,
        }),
      {
        initialProps: {
          graphData: initialGraphData,
          graphMode: '3d' as const,
          graphReady: true,
        },
      },
    );

    act(() => {
      vi.runAllTimers();
    });
    expect(fitView).toHaveBeenCalledOnce();

    rerender({
      graphData: nextGraphData,
      graphMode: '3d' as const,
      graphReady: true,
    });
    act(() => {
      vi.runAllTimers();
    });
    expect(fitView).toHaveBeenCalledTimes(2);

    act(() => {
      result.current();
    });
    expect(handleEngineStop).toHaveBeenCalledOnce();
    expect(fitView).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
