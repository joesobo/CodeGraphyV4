import type { PointerEvent as ReactPointerEvent } from 'react';
import { canvasPointerGeometry } from '../../camera/geometry/canvas';
import { synchronizeOwnedDraggedNodes } from '../drag';
import type { OwnedGraphInteractionRuntime, PointerSession } from '../model';
import { updateContextGesture } from '../context/model';
import { updateHover } from '../hover/update';
import { screenToWorld } from '../picking';
import type { OwnedGraphLayout } from '../../layout/runtime/model';

function moved(start: { x: number; y: number }, current: { x: number; y: number }): boolean {
  return Math.hypot(current.x - start.x, current.y - start.y) > 3;
}

function moveDraggedNode(runtime: OwnedGraphInteractionRuntime, layout: OwnedGraphLayout, session: PointerSession | null, screen: { x: number; y: number }, world: { x: number; y: number }): boolean {
  if (session?.index === null || session?.index === undefined) return false;
  if (!session.moved && !moved(session.startScreen, screen)) return true;
  if (!session.moved) {
    session.moved = true; layout.engine.pin(session.index); session.draggedIndexes.add(session.index);
    layout.engine.setAlphaTarget(0.3);
  }
  const node = layout.nodes[session.index];
  const translate = { x: world.x - session.lastWorld.x, y: world.y - session.lastWorld.y };
  session.lastWorld = world;
  layout.engine.setNodePosition(session.index, world.x, world.y);
  runtime.positionVersionRef.current += 1;
  node.x = world.x; node.y = world.y; node.fx = world.x; node.fy = world.y;
  runtime.propsRef.current.sharedProps.onNodeDrag(node, translate);
  synchronizeOwnedDraggedNodes(layout, session.draggedIndexes);
  runtime.engineStopNotifiedRef.current = false;
  runtime.requestFrameRef.current();
  return true;
}

export function movePointerSession(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>): void {
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  if (updateContextGesture(runtime, event, pointer)) return;
  const layout = runtime.layoutRef.current;
  if (!layout) return;
  const world = screenToWorld(runtime, pointer);
  const session = runtime.pointerSessionRef.current;
  if (moveDraggedNode(runtime, layout, session, pointer, world)) return;
  if (session) session.moved ||= moved(session.startScreen, pointer);
  updateHover(runtime, layout, world, { x: pointer.x, y: pointer.y });
}
