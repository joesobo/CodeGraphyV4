import type { OwnedGraphCamera } from '../camera/runtime/model';
import {
  graphPointFromMinimap,
  type MinimapPoint,
  type MinimapProjection,
} from './projection';
import type { MinimapViewport } from './viewport';

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
