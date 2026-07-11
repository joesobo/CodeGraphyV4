import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../src/webview/components/graph/model/build';
import { useGraphMarqueeSelectionRuntime } from '../../../../../../src/webview/components/graph/runtime/use/interaction/marquee/hook';

function createEvent(
  button: number,
  x: number,
  y: number,
  shiftKey = false,
  target: EventTarget | null = null,
  ctrlKey = false,
) {
  return {
    button,
    clientX: x,
    clientY: y,
    ctrlKey,
    preventDefault: vi.fn(),
    shiftKey,
    target,
  };
}

function createMarqueeRuntime(options: {
  containerRect?: Partial<DOMRect>;
  graph?: { graph2ScreenCoords?: (x: number, y: number) => { x: number; y: number } } | null;
  graphMode?: '2d' | '2d';
  hoveredNode?: FGNode | null;
  selectedNodeIds?: string[];
} = {}) {
  const setSelection = vi.fn();
  const setHighlight = vi.fn();
  const container = document.createElement('div');
  if (options.containerRect) {
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...options.containerRect,
    });
  }
  const nodes = [
    { id: 'inside', x: 15, y: 15 },
    { id: 'outside', x: 50, y: 50 },
  ] as FGNode[];
  const graph = options.graph === undefined
    ? {
        graph2ScreenCoords: (x: number, y: number) => ({ x, y }),
      }
    : options.graph;
  const { result } = renderHook(() => useGraphMarqueeSelectionRuntime({
    containerRef: { current: container } as never,
    fg2dRef: { current: graph } as never,
    graphDataRef: { current: { links: [], nodes } } as never,
    hoveredNodeRef: { current: options.hoveredNode ?? null },
    interactionHandlers: {
      setHighlight,
      setSelection,
    } as never,
    selectedNodesSetRef: { current: new Set(options.selectedNodeIds ?? []) } as never,
  }));

  return {
    result,
    setHighlight,
    setSelection,
  };
}

describe('graph/runtime/use/interaction marquee', () => {


    it('keeps marquee selection active after the threshold is crossed', () => {
      const runtime = createMarqueeRuntime();
      const moveInsideThreshold = createEvent(0, 12, 12);

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 20, 20) as never);
        runtime.result.current.handleMouseMoveCapture(moveInsideThreshold as never);
      });

      expect(moveInsideThreshold.preventDefault).toHaveBeenCalledTimes(1);
      expect(runtime.result.current.marqueeSelection).toEqual({
        bounds: {
          height: 2,
          left: 10,
          top: 10,
          width: 2,
        },
      });
    });



    it('ignores non-left mouseup and keeps the current marquee active', () => {
      const runtime = createMarqueeRuntime();
      const up = createEvent(2, 20, 20);

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 20, 20) as never);
        runtime.result.current.handleMouseUpCapture(up as never);
      });

      expect(up.preventDefault).not.toHaveBeenCalled();
      expect(runtime.result.current.marqueeSelection).not.toBeNull();
      expect(runtime.setSelection).not.toHaveBeenCalled();
    });



    it('ignores left mouseup when no marquee drag is active', () => {
      const runtime = createMarqueeRuntime();
      const up = createEvent(0, 20, 20);

      act(() => {
        runtime.result.current.handleMouseUpCapture(up as never);
      });

      expect(up.preventDefault).not.toHaveBeenCalled();
      expect(runtime.setSelection).not.toHaveBeenCalled();
    });



    it('does not start marquee selection on hovered nodes or right-button drags', () => {
      const hovered = createMarqueeRuntime({ hoveredNode: { id: 'inside' } as FGNode });
      const rightButton = createMarqueeRuntime();

      act(() => {
        hovered.result.current.handleMouseDownCapture(createEvent(0, 10, 10) as never);
        hovered.result.current.handleMouseMoveCapture(createEvent(0, 20, 20) as never);
        rightButton.result.current.handleMouseDownCapture(createEvent(2, 10, 10) as never);
        rightButton.result.current.handleMouseMoveCapture(createEvent(2, 20, 20) as never);
      });

      expect(hovered.result.current.marqueeSelection).toBeNull();
      expect(rightButton.result.current.marqueeSelection).toBeNull();
      expect(hovered.setSelection).not.toHaveBeenCalled();
      expect(rightButton.setSelection).not.toHaveBeenCalled();
    });



    it('does not start marquee selection from section frame drag targets', () => {
      const runtime = createMarqueeRuntime();
      const frame = document.createElement('div');
      const dragHandle = document.createElement('div');
      frame.dataset.graphMarqueeIgnore = 'true';
      frame.append(dragHandle);

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10, false, dragHandle) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 30, 30, false, dragHandle) as never);
        runtime.result.current.handleMouseUpCapture(createEvent(0, 30, 30, false, dragHandle) as never);
      });

      expect(runtime.result.current.marqueeSelection).toBeNull();
      expect(runtime.setSelection).not.toHaveBeenCalled();
    });



    it('does not start marquee selection during ctrl-left viewport panning', () => {
      const runtime = createMarqueeRuntime();

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10, false, null, true) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 30, 30, false, null, true) as never);
        runtime.result.current.handleMouseUpCapture(createEvent(0, 30, 30, false, null, true) as never);
      });

      expect(runtime.result.current.marqueeSelection).toBeNull();
      expect(runtime.setSelection).not.toHaveBeenCalled();
    });
});
