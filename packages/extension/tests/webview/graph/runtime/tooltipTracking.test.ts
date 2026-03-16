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
});
