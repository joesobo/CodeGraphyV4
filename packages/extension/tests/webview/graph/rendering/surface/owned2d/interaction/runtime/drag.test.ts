import { describe, expect, it, vi } from 'vitest';
import { createSingleNodeInteractionFixture } from './fixture';

describe('owned graph pointer interaction lifecycle', () => {
  it('pins a node once when pointer movement crosses the drag threshold', () => {
    const fixture = createSingleNodeInteractionFixture();
    const pin = vi.spyOn(fixture.engine, 'pin');

    fixture.handlers.handlePointerDown(fixture.pointer(50, 10));
    expect(pin).not.toHaveBeenCalled();
    fixture.handlers.handlePointerMove(fixture.pointer(54, 12));
    expect(pin).toHaveBeenCalledOnce();
    expect(fixture.graphNode).toMatchObject({ x: 4, y: 0, fx: 4, fy: 0 });
    expect(Array.from(fixture.engine.x)).toEqual([4]);
    expect(fixture.runtime.positionVersionRef.current).toBe(1);
    expect(fixture.runtime.requestFrameRef.current).toHaveBeenCalled();
    fixture.handlers.handlePointerMove(fixture.pointer(60, 14));
    expect(pin).toHaveBeenCalledOnce();
    fixture.handlers.handlePointerUp(fixture.pointer(60, 16));
    expect(fixture.getBoundingClientRect).toHaveBeenCalledTimes(3);
  });

  it('releases a dragged node and notifies the host when the pointer is canceled', () => {
    const fixture = createSingleNodeInteractionFixture();

    fixture.handlers.handlePointerDown(fixture.pointer(50, 10));
    fixture.handlers.handlePointerMove(fixture.pointer(54, 12));
    fixture.handlers.handlePointerCancel(fixture.pointer(54, 14));

    expect(fixture.runtime.pointerSessionRef.current).toBeNull();
    expect(fixture.graphNode).toMatchObject({ fx: undefined, fy: undefined });
    expect(fixture.props.sharedProps.onNodeDragEnd).toHaveBeenCalledOnce();
    expect(fixture.props.sharedProps.onNodeDragEnd).toHaveBeenCalledWith(fixture.graphNode);
    expect(fixture.canvas.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('clears node and link hover when the pointer leaves an idle surface', () => {
    const fixture = createSingleNodeInteractionFixture();
    fixture.runtime.hoveredNodeRef.current = fixture.graphNode;
    fixture.runtime.clearLinkHover.mockReturnValueOnce(true);

    fixture.handlers.handlePointerLeave();

    expect(fixture.runtime.hoveredNodeRef.current).toBeNull();
    expect(fixture.props.sharedProps.onNodeHover).toHaveBeenCalledWith(null);
    expect(fixture.runtime.clearLinkHover).toHaveBeenCalledOnce();
    expect(fixture.runtime.requestFrameRef.current).toHaveBeenCalledTimes(2);
  });

  it('preserves node hover while an active pointer session owns the surface', () => {
    const fixture = createSingleNodeInteractionFixture();
    fixture.runtime.hoveredNodeRef.current = fixture.graphNode;
    fixture.runtime.pointerSessionRef.current = {
      draggedIndexes: new Set(),
      index: 0,
      lastWorld: { x: 0, y: 0 },
      link: null,
      moved: false,
      node: fixture.graphNode,
      nodeId: fixture.graphNode.id,
      startScreen: { x: 50, y: 50 },
    };

    fixture.handlers.handlePointerLeave();

    expect(fixture.runtime.hoveredNodeRef.current).toBe(fixture.graphNode);
    expect(fixture.props.sharedProps.onNodeHover).not.toHaveBeenCalled();
    expect(fixture.runtime.requestFrameRef.current).not.toHaveBeenCalled();
  });
});
