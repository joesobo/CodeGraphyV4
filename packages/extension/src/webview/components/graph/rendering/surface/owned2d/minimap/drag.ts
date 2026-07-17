import type { PointerEvent as ReactPointerEvent } from 'react';
import { cancelOwnedGraphCameraTransition } from '../camera/runtime/model';
import type { MinimapInteractionRuntime } from './interaction';
import {
  beginMinimapNavigation,
  moveMinimapNavigation,
} from './navigation';
import type { MinimapPoint, MinimapProjection } from './projection';
import { suppressMinimapEvent } from './events';
import { projectMinimapViewport } from './viewport';

function panelPoint(
  element: HTMLDivElement,
  event: { clientX: number; clientY: number },
  projection: MinimapProjection,
): MinimapPoint {
  const bounds = element.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * projection.size / Math.max(1, bounds.width),
    y: (event.clientY - bounds.top) * projection.size / Math.max(1, bounds.height),
  };
}

function applyCameraCenter(
  runtime: MinimapInteractionRuntime,
  center: MinimapPoint,
): void {
  const camera = runtime.cameraRef.current;
  cancelOwnedGraphCameraTransition(camera);
  camera.centerX = center.x;
  camera.centerY = center.y;
  runtime.requestFrame();
}

export function handleMinimapPointerDown(
  runtime: MinimapInteractionRuntime,
  event: ReactPointerEvent<HTMLDivElement>,
): void {
  if (event.button !== 0 || runtime.sessionRef.current) return;
  const projection = runtime.projectionRef.current;
  const mainCanvas = runtime.mainCanvasRef.current;
  if (!projection || !mainCanvas) return;
  suppressMinimapEvent(event);
  const mainBounds = mainCanvas.getBoundingClientRect();
  const start = beginMinimapNavigation({
    camera: runtime.cameraRef.current,
    panelPoint: panelPoint(event.currentTarget, event, projection),
    pointerId: event.pointerId,
    projection,
    viewport: projectMinimapViewport(projection, {
      camera: runtime.cameraRef.current,
      viewportHeight: Math.max(1, mainBounds.height),
      viewportWidth: Math.max(1, mainBounds.width),
    }),
  });
  runtime.sessionRef.current = start.session;
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.focus({ preventScroll: true });
  runtime.clearHover();
  applyCameraCenter(runtime, start.cameraCenter);
}

export function handleMinimapPointerMove(
  runtime: MinimapInteractionRuntime,
  event: ReactPointerEvent<HTMLDivElement>,
): void {
  const session = runtime.sessionRef.current;
  const projection = runtime.projectionRef.current;
  if (!session || session.pointerId !== event.pointerId || !projection) return;
  suppressMinimapEvent(event);
  applyCameraCenter(
    runtime,
    moveMinimapNavigation(
      session,
      projection,
      panelPoint(event.currentTarget, event, projection),
    ),
  );
}
