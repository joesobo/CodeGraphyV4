import type { PointerEvent as ReactPointerEvent } from 'react';
import type { OwnedGraphInteractionRuntime } from '../model';
import { routeOwnedContextGesture } from './routing';

export function contextGestureButton(event: ReactPointerEvent<HTMLCanvasElement>): 0 | 2 | null {
  if (event.button === 2) return 2;
  return event.button === 0 && event.ctrlKey ? 0 : null;
}

export function beginContextGesture(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>, screen: { x: number; y: number }, button: 0 | 2): void {
  runtime.contextGestureSessionRef.current = { button, moved: false, pointerId: event.pointerId, startScreen: screen };
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

export function updateContextGesture(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>, screen: { x: number; y: number }): boolean {
  const session = runtime.contextGestureSessionRef.current;
  if (!session || session.pointerId !== event.pointerId) return false;
  session.moved ||= Math.hypot(screen.x - session.startScreen.x, screen.y - session.startScreen.y) > 2;
  return true;
}

function releaseCapture(canvas: HTMLCanvasElement, pointerId: number): void {
  if (canvas.hasPointerCapture?.(pointerId)) canvas.releasePointerCapture(pointerId);
}

export function finishContextGesture(runtime: OwnedGraphInteractionRuntime, event: ReactPointerEvent<HTMLCanvasElement>, route: boolean): boolean {
  const session = runtime.contextGestureSessionRef.current;
  if (!session || session.pointerId !== event.pointerId) return false;
  runtime.contextGestureSessionRef.current = null;
  releaseCapture(event.currentTarget, event.pointerId);
  if (route) routeOwnedContextGesture(runtime, session, event);
  return true;
}
