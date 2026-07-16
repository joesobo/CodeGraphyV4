import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGraphViewportPanRuntime } from '../../../../../../src/webview/components/graph/runtime/use/interaction/viewportPan/hook';

function createEvent(button: number, x: number, y: number, ctrlKey = false) {
  return {
    button,
    clientX: x,
    clientY: y,
    ctrlKey,
    preventDefault: vi.fn(),
  };
}

type PanGraph = {
  centerAt?: ReturnType<typeof vi.fn>;
  screen2GraphCoords?: ReturnType<typeof vi.fn>;
  zoom?: ReturnType<typeof vi.fn>;
};

function createPanRuntime(options: {
  container?: HTMLDivElement | null;
  graph?: PanGraph | null;
  rightMouseDown?: {
    ctrlKey: boolean;
    moved: boolean;
    x: number;
    y: number;
  } | null;
} = {}) {
  const container = options.container === undefined
    ? document.createElement('div')
    : options.container;
  if (container) {
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      bottom: 300,
      height: 300,
      left: 0,
      right: 400,
      top: 0,
      width: 400,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
  }
  const graph = options.graph === undefined
    ? {
        centerAt: vi.fn(),
        screen2GraphCoords: vi.fn(() => ({ x: 100, y: 200 })),
        zoom: vi.fn(() => 2),
      }
    : options.graph;
  const rightMouseDownRef = {
    current: options.rightMouseDown === undefined ? {
      ctrlKey: false,
      moved: false,
      x: 10,
      y: 20,
    } : options.rightMouseDown,
  };
  const suppressContextMenu = vi.fn();
  const { result } = renderHook(() => useGraphViewportPanRuntime({
    containerRef: { current: container } as never,
    fg2dRef: { current: graph } as never,
    rightMouseDownRef: rightMouseDownRef as never,
    suppressContextMenu,
  }));

  return {
    graph,
    result,
    rightMouseDownRef,
    suppressContextMenu,
  };
}

describe('graph/runtime/use/interaction viewport pan', () => {
  it('pans the 2d viewport with right-button drag and suppresses the context menu', () => {
    const runtime = createPanRuntime();
    const down = createEvent(2, 10, 20);
    const move = createEvent(2, 16, 24);
    const up = createEvent(2, 16, 24);

    runtime.result.current.handleMouseDownCapture(down as never);
    runtime.result.current.handleMouseMoveCapture(move as never);
    runtime.result.current.handleMouseUpCapture(up as never);

    expect(down.preventDefault).toHaveBeenCalledTimes(1);
    expect(move.preventDefault).toHaveBeenCalledTimes(1);
    expect(up.preventDefault).toHaveBeenCalledTimes(1);
    expect(runtime.graph?.screen2GraphCoords).toHaveBeenCalledWith(200, 150);
    expect(runtime.graph?.centerAt).toHaveBeenCalledWith(97, 198, 0);
    expect(runtime.suppressContextMenu).toHaveBeenCalledTimes(1);
    expect(runtime.rightMouseDownRef.current?.moved).toBe(true);
  });

  it('pans with middle-button drag without suppressing right-click context menus', () => {
    const runtime = createPanRuntime();

    runtime.result.current.handleMouseDownCapture(createEvent(1, 10, 20) as never);
    runtime.result.current.handleMouseMoveCapture(createEvent(1, 14, 20) as never);

    expect(runtime.graph?.centerAt).toHaveBeenCalledWith(98, 200, 0);
    expect(runtime.suppressContextMenu).not.toHaveBeenCalled();
    expect(runtime.rightMouseDownRef.current?.moved).toBe(false);
  });

  it('pans with ctrl-left drag and suppresses native context menu fallback', () => {
    const runtime = createPanRuntime();
    const down = createEvent(0, 10, 20, true);
    const move = createEvent(0, 16, 24, true);
    const up = createEvent(0, 16, 24, true);

    runtime.result.current.handleMouseDownCapture(down as never);
    runtime.result.current.handleMouseMoveCapture(move as never);
    runtime.result.current.handleMouseUpCapture(up as never);

    expect(down.preventDefault).toHaveBeenCalledTimes(1);
    expect(move.preventDefault).toHaveBeenCalledTimes(1);
    expect(up.preventDefault).toHaveBeenCalledTimes(1);
    expect(runtime.graph?.centerAt).toHaveBeenCalledWith(97, 198, 0);
    expect(runtime.suppressContextMenu).toHaveBeenCalledTimes(1);
    expect(runtime.rightMouseDownRef.current?.moved).toBe(false);
  });

  it('ignores plain left-button drag', () => {
    const runtime = createPanRuntime();
    const leftDown = createEvent(0, 10, 20);

    runtime.result.current.handleMouseDownCapture(leftDown as never);
    runtime.result.current.handleMouseMoveCapture(createEvent(0, 30, 40) as never);

    expect(leftDown.preventDefault).not.toHaveBeenCalled();
    expect(runtime.graph?.centerAt).not.toHaveBeenCalled();
  });

  it('does not pan or suppress context menus before the drag threshold', () => {
    const runtime = createPanRuntime();
    const move = createEvent(2, 11, 21);
    const up = createEvent(2, 11, 21);

    runtime.result.current.handleMouseDownCapture(createEvent(2, 10, 20) as never);
    runtime.result.current.handleMouseMoveCapture(move as never);
    runtime.result.current.handleMouseUpCapture(up as never);

    expect(move.preventDefault).not.toHaveBeenCalled();
    expect(up.preventDefault).not.toHaveBeenCalled();
    expect(runtime.graph?.centerAt).not.toHaveBeenCalled();
    expect(runtime.suppressContextMenu).not.toHaveBeenCalled();
  });
});
