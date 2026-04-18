import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetPendingAutoFit,
  runAutoFitEngineStop,
  schedulePending3dAutoFit,
  useGraphAutoFit,
} from '../../../../src/webview/components/graph/viewport/autoFit';

type AutoFitHookProps = {
  graphData: { nodes: Array<{ id?: string }> };
  graphMode: '2d' | '3d';
  graphReady: boolean;
};

describe('webview/graph/autoFit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('resets pending auto-fit on demand', () => {
    const pendingAutoFitRef = { current: false };

    resetPendingAutoFit(pendingAutoFitRef);

    expect(pendingAutoFitRef.current).toBe(true);
  });

  it('schedules a one-shot 3d auto-fit when the graph is ready', () => {
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
  });

  it('does not schedule auto-fit outside of 3d mode or before the graph is ready', () => {
    const fitView = vi.fn();
    const pendingAutoFitRef = { current: true };

    expect(schedulePending3dAutoFit({
      fitView,
      graphReady: true,
      graphMode: '2d',
      pendingAutoFitRef,
    })).toBeUndefined();

    pendingAutoFitRef.current = false;
    expect(schedulePending3dAutoFit({
      fitView,
      graphReady: true,
      graphMode: '3d',
      pendingAutoFitRef,
    })).toBeUndefined();

    pendingAutoFitRef.current = true;
    expect(schedulePending3dAutoFit({
      fitView,
      graphReady: false,
      graphMode: '3d',
      pendingAutoFitRef,
    })).toBeUndefined();
  });

  it('does not schedule auto-fit when window is unavailable', () => {
    vi.stubGlobal('window', undefined);

    const fitView = vi.fn();
    const pendingAutoFitRef = { current: true };

    expect(schedulePending3dAutoFit({
      fitView,
      graphReady: true,
      graphMode: '3d',
      pendingAutoFitRef,
    })).toBeUndefined();
  });

  it('cancels the scheduled timer when cleaned up before it fires', () => {
    const fitView = vi.fn();
    const pendingAutoFitRef = { current: true };

    const cleanup = schedulePending3dAutoFit({
      fitView,
      graphReady: true,
      graphMode: '3d',
      pendingAutoFitRef,
    });

    cleanup?.();
    vi.runAllTimers();

    expect(fitView).not.toHaveBeenCalled();
    expect(pendingAutoFitRef.current).toBe(true);
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

  it('delegates engine stop without fitting again once the graph has already settled', () => {
    const fitView = vi.fn();
    const handleEngineStop = vi.fn();
    const pendingAutoFitRef = { current: false };

    runAutoFitEngineStop({
      fitView,
      handleEngineStop,
      pendingAutoFitRef,
    });

    expect(fitView).not.toHaveBeenCalled();
    expect(handleEngineStop).toHaveBeenCalledOnce();
    expect(pendingAutoFitRef.current).toBe(false);
  });

  it('manages pending auto-fit across graph changes and engine stop', () => {
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
  });

  it('schedules auto-fit again when graph mode changes back to 3d', () => {
    const fitView = vi.fn();
    const handleEngineStop = vi.fn();
    const useAutoFitHook = ({ graphData, graphMode, graphReady }: AutoFitHookProps) =>
        useGraphAutoFit({
          fitView,
          graphData,
          graphMode,
          graphReady,
          handleEngineStop,
        });
    const initialProps: AutoFitHookProps = {
      graphData: { nodes: [] },
      graphMode: '2d',
      graphReady: true,
    };
    const nextProps: AutoFitHookProps = {
      graphData: { nodes: [{ id: 'a.ts' }] },
      graphMode: '3d',
      graphReady: true,
    };
    const { rerender } = renderHook(useAutoFitHook, {
      initialProps,
    });

    act(() => {
      vi.runAllTimers();
    });
    expect(fitView).not.toHaveBeenCalled();

    rerender(nextProps);

    act(() => {
      vi.runAllTimers();
    });

    expect(fitView).toHaveBeenCalledOnce();
  });
});
