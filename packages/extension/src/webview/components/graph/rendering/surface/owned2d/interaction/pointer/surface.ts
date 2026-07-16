import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from 'react';
import { cancelOwnedGraphCameraTransition, clampOwnedGraphZoom, screenToGraph } from '../../camera/runtime/model';
import { canvasPointerGeometry } from '../../camera/geometry/canvas';
import type { OwnedGraphInteractionRuntime } from '../model';
import { setOwnedGraphNodeHover } from '../hover/model';

export function suppressNativeContextMenu(event: ReactMouseEvent<HTMLCanvasElement>): void {
  event.preventDefault();
  event.stopPropagation();
}

export function zoomAtPointer(runtime: OwnedGraphInteractionRuntime, event: ReactWheelEvent<HTMLCanvasElement>): void {
  cancelOwnedGraphCameraTransition(runtime.cameraRef.current);
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  const world = screenToGraph(runtime.cameraRef.current, pointer.width, pointer.height, pointer.x, pointer.y);
  const zoom = clampOwnedGraphZoom(runtime.cameraRef.current.zoom * Math.exp(-event.deltaY * 0.0015));
  runtime.cameraRef.current.zoom = zoom;
  runtime.cameraRef.current.centerX = world.x - (pointer.x - pointer.width / 2) / zoom;
  runtime.cameraRef.current.centerY = world.y - (pointer.y - pointer.height / 2) / zoom;
  runtime.clearLinkHover();
  runtime.requestFrameRef.current();
}

export function leavePointerSurface(runtime: OwnedGraphInteractionRuntime): void {
  if (!runtime.pointerSessionRef.current && runtime.hoveredNodeRef.current) {
    runtime.hoveredNodeRef.current = null;
    setOwnedGraphNodeHover(runtime.nodeHoverRef.current, null, performance.now());
    runtime.propsRef.current.sharedProps.onNodeHover(null);
    runtime.requestFrameRef.current();
  }
  if (runtime.clearLinkHover()) runtime.requestFrameRef.current();
}
