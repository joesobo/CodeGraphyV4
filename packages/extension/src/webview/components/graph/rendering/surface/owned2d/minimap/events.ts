import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { MinimapInteractionRuntime } from './interaction';
import { cancelOwnedGraphCameraTransition } from '../camera/runtime/model';
import { keyboardMinimapCameraCenter } from './keyboard';

export function suppressMinimapEvent(
  event: { preventDefault(): void; stopPropagation(): void },
): void {
  event.preventDefault();
  event.stopPropagation();
}

function endSession(
  runtime: MinimapInteractionRuntime,
  element: HTMLDivElement,
  pointerId: number,
): void {
  if (runtime.sessionRef.current?.pointerId !== pointerId) return;
  runtime.sessionRef.current = null;
  if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
}

export function handleMinimapKeyDown(
  runtime: MinimapInteractionRuntime,
  event: ReactKeyboardEvent<HTMLDivElement>,
): void {
  if (event.key === 'Escape') {
    const session = runtime.sessionRef.current;
    if (!session) return;
    suppressMinimapEvent(event);
    endSession(runtime, event.currentTarget, session.pointerId);
    return;
  }
  if (runtime.sessionRef.current) return;
  const mainCanvas = runtime.mainCanvasRef.current;
  if (!mainCanvas) return;
  const bounds = mainCanvas.getBoundingClientRect();
  const camera = runtime.cameraRef.current;
  const center = keyboardMinimapCameraCenter(
    event.key,
    camera,
    Math.max(1, bounds.width),
    Math.max(1, bounds.height),
    event.shiftKey,
  );
  if (!center) return;
  suppressMinimapEvent(event);
  cancelOwnedGraphCameraTransition(camera);
  camera.centerX = center.x;
  camera.centerY = center.y;
  runtime.requestFrame();
}

export function handleMinimapLostPointerCapture(
  runtime: MinimapInteractionRuntime,
  event: ReactPointerEvent<HTMLDivElement>,
): void {
  if (runtime.sessionRef.current?.pointerId === event.pointerId) {
    runtime.sessionRef.current = null;
  }
}

export function handleMinimapPointerCancel(
  runtime: MinimapInteractionRuntime,
  event: ReactPointerEvent<HTMLDivElement>,
): void {
  suppressMinimapEvent(event);
  endSession(runtime, event.currentTarget, event.pointerId);
}

export function handleMinimapPointerUp(
  runtime: MinimapInteractionRuntime,
  event: ReactPointerEvent<HTMLDivElement>,
): void {
  if (runtime.sessionRef.current?.pointerId !== event.pointerId) return;
  suppressMinimapEvent(event);
  endSession(runtime, event.currentTarget, event.pointerId);
}
