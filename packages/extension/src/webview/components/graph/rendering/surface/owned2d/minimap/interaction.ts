import type {
  KeyboardEvent as ReactKeyboardEvent,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SyntheticEvent,
  WheelEvent as ReactWheelEvent,
} from 'react';
import {
  cancelOwnedGraphCameraTransition,
  type OwnedGraphCamera,
} from '../camera/runtime/model';
import {
  graphPointFromMinimap,
  type MinimapPoint,
  type MinimapProjection,
} from './projection';
import { projectMinimapViewport, type MinimapViewport } from './viewport';

export interface MinimapNavigationSession {
  grabOffset: MinimapPoint;
  pointerId: number;
}

interface BeginMinimapNavigationInput {
  camera: OwnedGraphCamera;
  panelPoint: MinimapPoint;
  pointerId: number;
  projection: MinimapProjection;
  viewport: MinimapViewport;
}

function pointInsideViewport(point: MinimapPoint, viewport: MinimapViewport): boolean {
  const box = viewport.box;
  return Boolean(box
    && point.x >= box.x
    && point.x <= box.x + box.width
    && point.y >= box.y
    && point.y <= box.y + box.height);
}

export function beginMinimapNavigation(input: BeginMinimapNavigationInput): {
  cameraCenter: MinimapPoint;
  session: MinimapNavigationSession;
} {
  const graphPoint = graphPointFromMinimap(input.projection, input.panelPoint);
  const grabOffset = pointInsideViewport(input.panelPoint, input.viewport)
    ? {
        x: graphPoint.x - input.camera.centerX,
        y: graphPoint.y - input.camera.centerY,
      }
    : { x: 0, y: 0 };
  const session = { grabOffset, pointerId: input.pointerId };
  return {
    cameraCenter: moveMinimapNavigation(session, input.projection, input.panelPoint),
    session,
  };
}

export function moveMinimapNavigation(
  session: MinimapNavigationSession,
  projection: MinimapProjection,
  panelPoint: MinimapPoint,
): MinimapPoint {
  const graphPoint = graphPointFromMinimap(projection, panelPoint);
  return {
    x: graphPoint.x - session.grabOffset.x,
    y: graphPoint.y - session.grabOffset.y,
  };
}

export interface MinimapInteractionRuntime {
  cameraRef: MutableRefObject<OwnedGraphCamera>;
  mainCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  projectionRef: MutableRefObject<MinimapProjection | null>;
  sessionRef: MutableRefObject<MinimapNavigationSession | null>;
  clearHover(this: void): void;
  requestFrame(this: void): void;
}

export interface MinimapInteractionHandlers {
  onContextMenu(this: void, event: SyntheticEvent<HTMLDivElement>): void;
  onKeyDown(this: void, event: ReactKeyboardEvent<HTMLDivElement>): void;
  onLostPointerCapture(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerCancel(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerDown(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerMove(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onPointerUp(this: void, event: ReactPointerEvent<HTMLDivElement>): void;
  onWheel(this: void, event: ReactWheelEvent<HTMLDivElement>): void;
}

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

function endSession(
  runtime: MinimapInteractionRuntime,
  element: HTMLDivElement,
  pointerId: number,
): void {
  if (runtime.sessionRef.current?.pointerId !== pointerId) return;
  runtime.sessionRef.current = null;
  if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId);
}

function suppressEvent(event: { preventDefault(): void; stopPropagation(): void }): void {
  event.preventDefault();
  event.stopPropagation();
}

export function createMinimapInteractionHandlers(
  runtime: MinimapInteractionRuntime,
): MinimapInteractionHandlers {
  return {
    onContextMenu: suppressEvent,
    onKeyDown: event => {
      if (event.key !== 'Escape') return;
      const session = runtime.sessionRef.current;
      if (!session) return;
      suppressEvent(event);
      endSession(runtime, event.currentTarget, session.pointerId);
    },
    onLostPointerCapture: event => {
      if (runtime.sessionRef.current?.pointerId === event.pointerId) {
        runtime.sessionRef.current = null;
      }
    },
    onPointerCancel: event => {
      suppressEvent(event);
      endSession(runtime, event.currentTarget, event.pointerId);
    },
    onPointerDown: event => {
      if (event.button !== 0 || runtime.sessionRef.current) return;
      const projection = runtime.projectionRef.current;
      const mainCanvas = runtime.mainCanvasRef.current;
      if (!projection || !mainCanvas) return;
      suppressEvent(event);
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
    },
    onPointerMove: event => {
      const session = runtime.sessionRef.current;
      const projection = runtime.projectionRef.current;
      if (!session || session.pointerId !== event.pointerId || !projection) return;
      suppressEvent(event);
      applyCameraCenter(
        runtime,
        moveMinimapNavigation(
          session,
          projection,
          panelPoint(event.currentTarget, event, projection),
        ),
      );
    },
    onPointerUp: event => {
      if (runtime.sessionRef.current?.pointerId !== event.pointerId) return;
      suppressEvent(event);
      endSession(runtime, event.currentTarget, event.pointerId);
    },
    onWheel: suppressEvent,
  };
}
