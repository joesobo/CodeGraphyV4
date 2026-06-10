import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  runAutoFitEngineStop,
  useGraphAutoFit,
} from '../../../../src/webview/components/graph/viewport/autoFit';

describe('webview/graph/autoFit', () => {
  it('delegates engine stop without fitting the graph', () => {
    const handleEngineStop = vi.fn();

    runAutoFitEngineStop({
      handleEngineStop,
    });

    expect(handleEngineStop).toHaveBeenCalledOnce();
  });

  it('does not fit when graph data changes or when the engine stops', () => {
    const handleEngineStop = vi.fn();

    const { result, rerender } = renderHook(() =>
      useGraphAutoFit({
        handleEngineStop,
      }),
    );

    rerender();

    act(() => {
      result.current();
    });

    expect(handleEngineStop).toHaveBeenCalledOnce();
  });

  it('keeps the engine stop callback fresh without fitting the graph', () => {
    const handleEngineStop = vi.fn();
    const nextHandleEngineStop = vi.fn();

    const { result, rerender } = renderHook(
      ({ onEngineStop }: { onEngineStop(this: void): void }) =>
        useGraphAutoFit({
          handleEngineStop: onEngineStop,
        }),
      {
        initialProps: {
          onEngineStop: handleEngineStop,
        },
      },
    );

    rerender({
      onEngineStop: nextHandleEngineStop,
    });

    act(() => {
      result.current();
    });

    expect(handleEngineStop).not.toHaveBeenCalled();
    expect(nextHandleEngineStop).toHaveBeenCalledOnce();
  });
});
