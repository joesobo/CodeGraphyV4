import type { PointerEvent as ReactPointerEvent } from 'react';
import { releaseOwnedDraggedNodes } from './drag';
import type { OwnedGraphInteractionRuntime, PointerSession } from './interaction';
import { finishContextGesture } from './interactionContext';
import type { OwnedGraphLayout } from './layout';

function release(runtime: OwnedGraphInteractionRuntime, layout: OwnedGraphLayout, session: PointerSession, canvas: HTMLCanvasElement, pointerId: number): void {
  releaseOwnedDraggedNodes(layout, session.draggedIndexes);
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  layout.engine.setAlphaTarget(0);
  runtime.engineStopNotifiedRef.current = false;
  runtime.requestFrameRef.current();
}

function routeSurfaceClick(runtime: OwnedGraphInteractionRuntime, session: PointerSession, event: ReactPointerEvent<HTMLCanvasElement>): boolean {
  if (session.index !== null) return false;
  if (!session.moved && session.link) runtime.propsRef.current.sharedProps.onLinkClick(session.link, event.nativeEvent);
  else if (!session.moved) runtime.propsRef.current.sharedProps.onBackgroundClick(event.nativeEvent);
  return true;
}

export function completePointerSession(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>): void {
  if (finishContextGesture(runtime, event, true)) return;
  const layout = runtime.layoutRef.current;
  const session = runtime.pointerSessionRef.current;
  runtime.pointerSessionRef.current = null;
  if (!layout || !session || routeSurfaceClick(runtime, session, event)) return;
  const node = layout.nodes[session.index as number];
  if (session.moved) runtime.propsRef.current.sharedProps.onNodeDragEnd(node);
  else runtime.propsRef.current.sharedProps.onNodeClick(node, event.nativeEvent);
  release(runtime, layout, session, event.currentTarget, event.pointerId);
}

export function cancelPointerSession(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>): void {
  if (finishContextGesture(runtime, event, false)) return;
  const layout = runtime.layoutRef.current;
  const session = runtime.pointerSessionRef.current;
  runtime.pointerSessionRef.current = null;
  if (!layout || !session) return;
  if (session.index !== null && session.moved) {
    const node = layout.nodes[session.index];
    if (node) runtime.propsRef.current.sharedProps.onNodeDragEnd(node);
  }
  release(runtime, layout, session, event.currentTarget, event.pointerId);
}
