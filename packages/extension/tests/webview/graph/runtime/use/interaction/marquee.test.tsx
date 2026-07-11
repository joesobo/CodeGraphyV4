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

    it('shows marquee bounds while dragging and selects nodes inside the area', () => {
      const runtime = createMarqueeRuntime();
      const move = createEvent(0, 20, 20);
      const up = createEvent(0, 20, 20);

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10) as never);
        runtime.result.current.handleMouseMoveCapture(move as never);
      });

      expect(runtime.result.current.marqueeSelection).toEqual({
        bounds: {
          height: 10,
          left: 10,
          top: 10,
          width: 10,
        },
      });

      act(() => {
        runtime.result.current.handleMouseUpCapture(up as never);
      });

      expect(runtime.result.current.marqueeSelection).toBeNull();
      expect(move.preventDefault).toHaveBeenCalledTimes(1);
      expect(up.preventDefault).toHaveBeenCalledTimes(1);
      expect(runtime.setHighlight).toHaveBeenCalledWith(null);
      expect(runtime.setSelection).toHaveBeenCalledWith(['inside']);
    });



    it('toggles marquee hits in the current selection when shift is held', () => {
      const runtime = createMarqueeRuntime({ selectedNodeIds: ['existing'] });

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10, true) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 20, 20, true) as never);
        runtime.result.current.handleMouseUpCapture(createEvent(0, 20, 20, true) as never);
      });

      expect(runtime.setSelection).toHaveBeenCalledWith(['existing', 'inside']);
    });



    it('removes selected marquee hits when shift is held', () => {
      const runtime = createMarqueeRuntime({ selectedNodeIds: ['existing', 'inside'] });

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10, true) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 20, 20, true) as never);
        runtime.result.current.handleMouseUpCapture(createEvent(0, 20, 20, true) as never);
      });

      expect(runtime.setSelection).toHaveBeenCalledWith(['existing']);
    });



    it('uses local container coordinates for marquee bounds', () => {
      const runtime = createMarqueeRuntime({
        containerRect: {
          left: 5,
          top: 7,
        },
      });

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 15, 17) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 25, 27) as never);
      });

      expect(runtime.result.current.marqueeSelection).toEqual({
        bounds: {
          height: 10,
          left: 10,
          top: 10,
          width: 10,
        },
      });
    });



    it('uses graph-to-screen coordinates when selecting nodes', () => {
      const runtime = createMarqueeRuntime({
        graph: {
          graph2ScreenCoords: (x, y) => ({ x: x + 100, y: y + 100 }),
        },
      });

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 110, 110) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 120, 120) as never);
        runtime.result.current.handleMouseUpCapture(createEvent(0, 120, 120) as never);
      });

      expect(runtime.setSelection).toHaveBeenCalledWith(['inside']);
    });



    it('falls back to raw node coordinates when the 2d graph is unavailable', () => {
      const runtime = createMarqueeRuntime({ graph: null });

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10) as never);
        runtime.result.current.handleMouseMoveCapture(createEvent(0, 20, 20) as never);
        runtime.result.current.handleMouseUpCapture(createEvent(0, 20, 20) as never);
      });

      expect(runtime.setSelection).toHaveBeenCalledWith(['inside']);
    });



    it('does not select until the drag crosses the marquee threshold', () => {
      const runtime = createMarqueeRuntime();
      const move = createEvent(0, 12, 12);
      const up = createEvent(0, 12, 12);

      act(() => {
        runtime.result.current.handleMouseDownCapture(createEvent(0, 10, 10) as never);
        runtime.result.current.handleMouseMoveCapture(move as never);
        runtime.result.current.handleMouseUpCapture(up as never);
      });

      expect(move.preventDefault).not.toHaveBeenCalled();
      expect(up.preventDefault).not.toHaveBeenCalled();
      expect(runtime.result.current.marqueeSelection).toBeNull();
      expect(runtime.setSelection).not.toHaveBeenCalled();
    });
});
