import type { PointerEvent as ReactPointerEvent } from 'react';
import type { FGLink, FGNode } from '../../../../../model/build';
import { cancelOwnedGraphCameraTransition } from '../../camera/runtime/model';
import { canvasPointerGeometry } from '../../camera/geometry/canvas';
import { beginContextGesture, contextGestureButton } from '../context/model';
import { clearHoverForInteraction } from '../hover/update';
import type { OwnedGraphInteractionRuntime, PointerSession } from '../model';
import { pickLink, pickNode, screenToWorld } from '../picking';

function createSession(picked: { index: number; node: FGNode } | undefined, link: FGLink | null, world: { x: number; y: number }, screen: { x: number; y: number }): PointerSession {
  return picked ? {
    draggedIndexes: new Set(), index: picked.index, nodeId: picked.node.id, link: null,
    lastWorld: world, moved: false, node: picked.node, startScreen: screen,
  } : {
    draggedIndexes: new Set(), index: null, nodeId: null, link,
    lastWorld: world, moved: false, node: null, startScreen: screen,
  };
}

function beginPrimary(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>, pointer: ReturnType<typeof canvasPointerGeometry>): boolean {
  const layout = runtime.layoutRef.current;
  if (!layout) return false;
  const world = screenToWorld(runtime, pointer);
  const picked = pickNode(runtime, layout, world);
  runtime.pointerSessionRef.current = createSession(picked, picked ? null : pickLink(runtime, layout, world)?.link ?? null, world, pointer);
  runtime.requestFrameRef.current();
  if (picked) event.currentTarget.setPointerCapture(event.pointerId);
  return true;
}

export function beginPointerSession(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>): void {
  cancelOwnedGraphCameraTransition(runtime.cameraRef.current);
  const cleared = clearHoverForInteraction(runtime);
  const pointer = canvasPointerGeometry(event.currentTarget, event.nativeEvent);
  const contextButton = contextGestureButton(event);
  if (contextButton !== null) beginContextGesture(runtime, event, pointer, contextButton);
  else if (event.button === 0 && beginPrimary(runtime, event, pointer)) return;
  if (cleared) runtime.requestFrameRef.current();
}
