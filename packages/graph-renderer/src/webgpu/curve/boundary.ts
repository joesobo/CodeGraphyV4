import type { GraphRendererNodeStyle } from '../../contracts';
import { curveCoordinate, type CurveCoordinates } from './coordinate';
import { curveTangentCoordinate } from './tangent';
import { nodeBoundaryDistance } from '../node/boundary';
import { nextBoundaryOffset } from '../arrow/boundaryOffset';

export interface CurveBoundary {
  centerX: number;
  centerY: number;
  curveX: CurveCoordinates;
  curveY: CurveCoordinates;
  direction: 1 | -1;
  positionOrigin: number;
  style: GraphRendererNodeStyle;
  tangentX: number;
  tangentY: number;
  visualScale: number;
}

function initialOffset(boundary: CurveBoundary): number {
  const outwardX = boundary.tangentX * boundary.direction;
  const outwardY = boundary.tangentY * boundary.direction;
  const tangentLength = Math.hypot(outwardX, outwardY);
  if (tangentLength === 0) return 0;
  return Math.min(
    0.5,
    nodeBoundaryDistance(
      boundary.style,
      outwardX / tangentLength,
      outwardY / tangentLength,
      boundary.visualScale,
    ) / tangentLength,
  );
}

export function correctedCurveBoundaryOffset(boundary: CurveBoundary): number {
  let offset = initialOffset(boundary);
  if (offset === 0) return 0;
  let inside = 0;
  let outside = 0.5;
  for (let correction = 0; correction < 8; correction += 1) {
    const position = boundary.positionOrigin + boundary.direction * offset;
    const deltaX = curveCoordinate(boundary.curveX, position) - boundary.centerX;
    const deltaY = curveCoordinate(boundary.curveY, position) - boundary.centerY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance === 0) return 0;
    const edge = nodeBoundaryDistance(
      boundary.style,
      deltaX / distance,
      deltaY / distance,
      boundary.visualScale,
    );
    const tangentX = curveTangentCoordinate(boundary.curveX, position) * boundary.direction;
    const tangentY = curveTangentCoordinate(boundary.curveY, position) * boundary.direction;
    const radialDerivative = (deltaX * tangentX + deltaY * tangentY) / distance;
    const error = distance - edge;
    if (error >= 0) outside = offset;
    else inside = offset;
    offset = nextBoundaryOffset(
      offset - error / radialDerivative,
      radialDerivative,
      inside,
      outside,
    );
  }
  return offset;
}
