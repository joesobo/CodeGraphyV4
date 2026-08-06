import { describe, expect, it, vi } from 'vitest';
import type { Dispatch, SetStateAction } from 'react';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
import type { GraphTooltipState } from '../../../../../src/webview/components/graph/tooltip/model';
import {
  clearTooltipAnchorSnapshot,
  initializeTooltipAnchorSnapshot,
  updateTooltipAnchorSnapshot,
} from '../../../../../src/webview/components/graph/runtime/tooltip/tracking';

describe('tooltipTracking', () => {
  it('clears the tracked anchor', () => {
    const tooltipRectRef = { current: { x: 10, y: 20, radius: 30 } };

    clearTooltipAnchorSnapshot(tooltipRectRef);

    expect(tooltipRectRef.current).toBeNull();
  });

  it('starts tracking without owning an animation frame', () => {
    const requestAnimationFrameSpy = vi.fn();
    vi.stubGlobal('requestAnimationFrame', requestAnimationFrameSpy);
    const tooltipRectRef = { current: null };

    initializeTooltipAnchorSnapshot({
      getNodeRect: () => ({ x: 10, y: 20, radius: 30 }),
      hoveredNodeRef: { current: { id: 'node' } as FGNode },
      tooltipRectRef,
    });

    expect(tooltipRectRef.current).toEqual({ x: 10, y: 20, radius: 30 });
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();
  });

  it('updates visible tooltip state only after its tracked anchor changes', () => {
    const setTooltipData = vi.fn(
      (update: SetStateAction<GraphTooltipState>) => {
        const nextState =
          typeof update === 'function'
            ? update({
                info: null,
                nodeRect: { radius: 0, x: 0, y: 0 },
                path: '',
                pluginSections: [],
                visible: true,
              })
            : update;
        expect(nextState.nodeRect).toEqual({ x: 10, y: 20, radius: 30 });
      },
    ) as Dispatch<SetStateAction<GraphTooltipState>>;
    const tooltipRectRef = { current: { x: 1, y: 2, radius: 3 } };

    updateTooltipAnchorSnapshot({
      getNodeRect: () => ({ x: 10, y: 20, radius: 30 }),
      hoveredNodeRef: { current: { id: 'node' } as FGNode },
      setTooltipData,
      tooltipRectRef,
    });

    expect(setTooltipData).toHaveBeenCalledOnce();
    expect(tooltipRectRef.current).toEqual({ x: 10, y: 20, radius: 30 });
  });

  it('does not update a stationary tooltip across repeated graph frames', () => {
    const getNodeRect = vi.fn();
    const setTooltipData = vi.fn();
    const rect = { x: 10, y: 20, radius: 30 };
    getNodeRect.mockReturnValue(rect);
    const options = {
      getNodeRect,
      hoveredNodeRef: { current: { id: 'node' } as FGNode },
      setTooltipData,
      tooltipRectRef: { current: rect },
    };

    updateTooltipAnchorSnapshot(options);
    updateTooltipAnchorSnapshot(options);

    expect(getNodeRect).toHaveBeenCalledTimes(2);
    expect(setTooltipData).not.toHaveBeenCalled();
  });

  it('stops when the hovered node disappears or its rect is unavailable', () => {
    const setTooltipData = vi.fn();
    const tooltipRectRef = { current: { x: 10, y: 20, radius: 30 } };

    updateTooltipAnchorSnapshot({
      getNodeRect: vi.fn(),
      hoveredNodeRef: { current: null },
      setTooltipData,
      tooltipRectRef,
    });
    expect(tooltipRectRef.current).toBeNull();

    tooltipRectRef.current = { x: 10, y: 20, radius: 30 };
    updateTooltipAnchorSnapshot({
      getNodeRect: () => null,
      hoveredNodeRef: { current: { id: 'node' } as FGNode },
      setTooltipData,
      tooltipRectRef,
    });

    expect(tooltipRectRef.current).toBeNull();
    expect(setTooltipData).not.toHaveBeenCalled();
  });
});
