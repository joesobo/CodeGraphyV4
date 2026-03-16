import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../src/webview/components/graphModel';
import type { GraphTooltipState } from '../../../../src/webview/components/graphTooltipModel';
import {
  startTooltipTracking,
  stopTooltipTracking,
} from '../../../../src/webview/components/graph/runtime/tooltipTracking';

describe('tooltipTracking', () => {
  it('cancels an in-flight animation frame', () => {
    const cancelAnimationFrameSpy = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameSpy);
    const tooltipRafRef = { current: 42 };

    stopTooltipTracking(tooltipRafRef);

    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(42);
    expect(tooltipRafRef.current).toBeNull();
  });

  it('does not cancel an animation frame when none is active', () => {
    const cancelAnimationFrameSpy = vi.fn();
    vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameSpy);
    const tooltipRafRef = { current: null };

    stopTooltipTracking(tooltipRafRef);

    expect(cancelAnimationFrameSpy).not.toHaveBeenCalled();
    expect(tooltipRafRef.current).toBeNull();
  });

  it('updates the tooltip rect while the tooltip stays visible', () => {
    let frameCallback: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 7;
    });

    const setTooltipData = vi.fn((update: (previous: GraphTooltipState) => GraphTooltipState) => {
      const nextState = update({
        info: null,
        nodeRect: { radius: 0, x: 0, y: 0 },
        path: '',
        pluginSections: [],
        visible: true,
      });
      expect(nextState.nodeRect).toEqual({ x: 10, y: 20, radius: 30 });
    });
    const tooltipRafRef = { current: null as number | null };

    startTooltipTracking({
      getNodeRect: () => ({ x: 10, y: 20, radius: 30 }),
      hoveredNodeRef: { current: { id: 'node' } as FGNode },
      setTooltipData,
      tooltipRafRef,
    });

    frameCallback?.(0);

    expect(setTooltipData).toHaveBeenCalledOnce();
    expect(tooltipRafRef.current).toBe(7);
  });

  it('does not continue tracking after the hovered node disappears', () => {
    let frameCallback: FrameRequestCallback | undefined;
    const requestAnimationFrameSpy = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 11;
    });
    const getNodeRect = vi.fn();

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameSpy);

    const tooltipRafRef = { current: null as number | null };

    startTooltipTracking({
      getNodeRect,
      hoveredNodeRef: { current: null },
      setTooltipData: vi.fn(),
      tooltipRafRef,
    });

    frameCallback?.(0);

    expect(getNodeRect).not.toHaveBeenCalled();
    expect(requestAnimationFrameSpy).toHaveBeenCalledOnce();
    expect(tooltipRafRef.current).toBe(11);
  });

  it('does not update tooltip state when the node rect is unavailable', () => {
    let frameCallback: FrameRequestCallback | undefined;
    const requestAnimationFrameSpy = vi.fn((callback: FrameRequestCallback) => {
      frameCallback = callback;
      return requestAnimationFrameSpy.mock.calls.length + 20;
    });
    const setTooltipData = vi.fn();

    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameSpy);

    const tooltipRafRef = { current: null as number | null };

    startTooltipTracking({
      getNodeRect: () => null,
      hoveredNodeRef: { current: { id: 'node' } as FGNode },
      setTooltipData,
      tooltipRafRef,
    });

    frameCallback?.(0);

    expect(setTooltipData).not.toHaveBeenCalled();
    expect(requestAnimationFrameSpy).toHaveBeenCalledTimes(2);
    expect(tooltipRafRef.current).toBe(22);
  });

  it('keeps hidden tooltip state unchanged while tracking continues', () => {
    let frameCallback: FrameRequestCallback | undefined;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frameCallback = callback;
      return 15;
    });

    const hiddenState: GraphTooltipState = {
      info: null,
      nodeRect: { radius: 1, x: 1, y: 1 },
      path: 'node',
      pluginSections: [],
      visible: false,
    };
    const setTooltipData = vi.fn((update: (previous: GraphTooltipState) => GraphTooltipState) => {
      expect(update(hiddenState)).toBe(hiddenState);
    });

    startTooltipTracking({
      getNodeRect: () => ({ x: 10, y: 20, radius: 30 }),
      hoveredNodeRef: { current: { id: 'node' } as FGNode },
      setTooltipData,
      tooltipRafRef: { current: null },
    });

    frameCallback?.(0);

    expect(setTooltipData).toHaveBeenCalledOnce();
  });
});
