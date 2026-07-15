import type { GraphRendererNodeStyle } from '../contracts';
import { OWNED_SELF_LOOP_RADIUS } from './linkGeometry';

export const OWNED_ARROW_LENGTH = 12;
export const OWNED_ARROW_HALF_WIDTH = OWNED_ARROW_LENGTH / 1.6 / 2;

function ellipseBoundary(
  halfWidth: number,
  halfHeight: number,
  directionX: number,
  directionY: number,
): number {
  return 1 / Math.hypot(directionX / halfWidth, directionY / halfHeight);
}

function rectangleBoundary(
  halfWidth: number,
  halfHeight: number,
  cornerRadius: number,
  directionX: number,
  directionY: number,
): number {
  const absoluteX = Math.abs(directionX);
  const absoluteY = Math.abs(directionY);
  const radius = Math.min(Math.max(0, cornerRadius), halfWidth, halfHeight);
  const vertical = absoluteX === 0 ? Number.POSITIVE_INFINITY : halfWidth / absoluteX;
  if (vertical * absoluteY <= halfHeight - radius) return vertical;
  const horizontal = absoluteY === 0 ? Number.POSITIVE_INFINITY : halfHeight / absoluteY;
  if (horizontal * absoluteX <= halfWidth - radius) return horizontal;
  const cornerX = halfWidth - radius;
  const cornerY = halfHeight - radius;
  const projection = absoluteX * cornerX + absoluteY * cornerY;
  const discriminant = projection * projection
    - cornerX * cornerX
    - cornerY * cornerY
    + radius * radius;
  return projection + Math.sqrt(Math.max(0, discriminant));
}

function starBoundary(
  halfWidth: number,
  halfHeight: number,
  directionX: number,
  directionY: number,
): number {
  const localX = directionX / halfWidth;
  const localY = directionY / halfHeight;
  const angle = Math.atan2(localY, localX);
  const spike = 0.5 + 0.5 * Math.cos(angle * 5);
  const radius = 0.48 + 0.52 * spike * spike;
  return radius / Math.hypot(localX, localY);
}

function shapeBoundaryDistance(
  shape: GraphRendererNodeStyle['shape'],
  cornerRadius: number,
  halfWidth: number,
  halfHeight: number,
  directionX: number,
  directionY: number,
): number {
  const localX = directionX / halfWidth;
  const localY = directionY / halfHeight;
  switch (shape) {
    case 'circle':
      return ellipseBoundary(halfWidth, halfHeight, directionX, directionY);
    case 'rectangle':
    case 'square':
      return rectangleBoundary(
        halfWidth,
        halfHeight,
        cornerRadius,
        directionX,
        directionY,
      );
    case 'diamond':
      return 1 / (Math.abs(localX) + Math.abs(localY));
    case 'triangle':
      return 0.5 / Math.max(Math.abs(localX) * 0.866025 - localY * 0.5, localY);
    case 'hexagon':
      return 1 / Math.max(
        Math.abs(localX) * 0.866025 + Math.abs(localY) * 0.5,
        Math.abs(localY),
      );
    case 'star':
      return starBoundary(halfWidth, halfHeight, directionX, directionY);
  }
}

function nodeBoundaryDistance(
  style: GraphRendererNodeStyle,
  directionX: number,
  directionY: number,
  visualScale: number,
): number {
  const halfWidth = Math.max(0.5, style.width * visualScale / 2);
  const halfHeight = Math.max(0.5, style.height * visualScale / 2);
  return shapeBoundaryDistance(
    style.shape,
    style.cornerRadius * visualScale,
    halfWidth,
    halfHeight,
    directionX,
    directionY,
  );
}

function curveCoordinate(
  source: number,
  target: number,
  firstControl: number,
  secondControl: number,
  cubic: boolean,
  position: number,
): number {
  const inverse = 1 - position;
  if (cubic) {
    return inverse ** 3 * source
      + 3 * inverse * inverse * position * firstControl
      + 3 * inverse * position * position * secondControl
      + position ** 3 * target;
  }
  return inverse * inverse * source
    + 2 * inverse * position * firstControl
    + position * position * target;
}

function curveTangentCoordinate(
  source: number,
  target: number,
  firstControl: number,
  secondControl: number,
  cubic: boolean,
  position: number,
): number {
  const inverse = 1 - position;
  if (cubic) {
    return 3 * inverse * inverse * (firstControl - source)
      + 6 * inverse * position * (secondControl - firstControl)
      + 3 * position * position * (target - secondControl);
  }
  return 2 * inverse * (firstControl - source)
    + 2 * position * (target - firstControl);
}

function nextBoundaryOffset(
  newton: number,
  radialDerivative: number,
  inside: number,
  outside: number,
): number {
  if (radialDerivative <= 0.000001) return (inside + outside) / 2;
  if (!Number.isFinite(newton)) return (inside + outside) / 2;
  if (newton <= inside || newton >= outside) return (inside + outside) / 2;
  return newton;
}

function correctedBoundaryOffset(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  firstControlX: number,
  firstControlY: number,
  secondControlX: number,
  secondControlY: number,
  cubic: boolean,
  centerX: number,
  centerY: number,
  positionOrigin: number,
  direction: 1 | -1,
  tangentX: number,
  tangentY: number,
  style: GraphRendererNodeStyle,
  visualScale: number,
): number {
  const outwardX = tangentX * direction;
  const outwardY = tangentY * direction;
  const tangentLength = Math.hypot(outwardX, outwardY);
  if (tangentLength === 0) return 0;
  let offset = Math.min(
    0.5,
    nodeBoundaryDistance(style, outwardX / tangentLength, outwardY / tangentLength, visualScale)
      / tangentLength,
  );
  let inside = 0;
  let outside = 0.5;
  for (let correction = 0; correction < 8; correction += 1) {
    const position = positionOrigin + direction * offset;
    const pointX = curveCoordinate(
      sourceX,
      targetX,
      firstControlX,
      secondControlX,
      cubic,
      position,
    );
    const pointY = curveCoordinate(
      sourceY,
      targetY,
      firstControlY,
      secondControlY,
      cubic,
      position,
    );
    const deltaX = pointX - centerX;
    const deltaY = pointY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance === 0) return 0;
    const boundary = nodeBoundaryDistance(
      style,
      deltaX / distance,
      deltaY / distance,
      visualScale,
    );
    const curveTangentX = curveTangentCoordinate(
      sourceX,
      targetX,
      firstControlX,
      secondControlX,
      cubic,
      position,
    );
    const curveTangentY = curveTangentCoordinate(
      sourceY,
      targetY,
      firstControlY,
      secondControlY,
      cubic,
      position,
    );
    const offsetTangentX = curveTangentX * direction;
    const offsetTangentY = curveTangentY * direction;
    const radialDerivative = (
      deltaX * offsetTangentX + deltaY * offsetTangentY
    ) / distance;
    const error = distance - boundary;
    if (error >= 0) {
      outside = offset;
    } else {
      inside = offset;
    }
    const newton = offset - error / radialDerivative;
    offset = nextBoundaryOffset(newton, radialDerivative, inside, outside);
  }
  return offset;
}

function writeStraightBoundaryOffsets(
  output: Float32Array,
  offset: number,
  deltaX: number,
  deltaY: number,
  distance: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale: number,
): void {
  const directionX = deltaX / distance;
  const directionY = deltaY / distance;
  output[offset] = Math.min(
    1,
    nodeBoundaryDistance(sourceStyle, directionX, directionY, visualScale) / distance,
  );
  output[offset + 1] = Math.max(
    0,
    1 - nodeBoundaryDistance(targetStyle, -directionX, -directionY, visualScale) / distance,
  );
}

function writeCurveBoundaryOffsets(
  output: Float32Array,
  offset: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  firstControlX: number,
  firstControlY: number,
  secondControlX: number,
  secondControlY: number,
  cubic: boolean,
  tangentMultiplier: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale: number,
): void {
  const sourceTangentX = tangentMultiplier * (firstControlX - sourceX);
  const sourceTangentY = tangentMultiplier * (firstControlY - sourceY);
  const targetTangentX = tangentMultiplier * (targetX - secondControlX);
  const targetTangentY = tangentMultiplier * (targetY - secondControlY);
  output[offset] = correctedBoundaryOffset(
    sourceX,
    sourceY,
    targetX,
    targetY,
    firstControlX,
    firstControlY,
    secondControlX,
    secondControlY,
    cubic,
    sourceX,
    sourceY,
    0,
    1,
    sourceTangentX,
    sourceTangentY,
    sourceStyle,
    visualScale,
  );
  output[offset + 1] = 1 - correctedBoundaryOffset(
    sourceX,
    sourceY,
    targetX,
    targetY,
    firstControlX,
    firstControlY,
    secondControlX,
    secondControlY,
    cubic,
    targetX,
    targetY,
    1,
    -1,
    targetTangentX,
    targetTangentY,
    targetStyle,
    visualScale,
  );
}

function writeSelfLoopBoundaryOffsets(
  output: Float32Array,
  offset: number,
  sourceX: number,
  sourceY: number,
  curvature: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale: number,
): void {
  const radius = Math.max(0.5, Math.abs(curvature)) * OWNED_SELF_LOOP_RADIUS;
  writeCurveBoundaryOffsets(
    output,
    offset,
    sourceX,
    sourceY,
    sourceX,
    sourceY,
    sourceX,
    sourceY - radius,
    sourceX + radius,
    sourceY,
    true,
    3,
    sourceStyle,
    targetStyle,
    visualScale,
  );
}

function writeQuadraticBoundaryOffsets(
  output: Float32Array,
  offset: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  deltaX: number,
  deltaY: number,
  curvature: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale: number,
): void {
  const controlX = (sourceX + targetX) / 2 + deltaY * curvature;
  const controlY = (sourceY + targetY) / 2 - deltaX * curvature;
  writeCurveBoundaryOffsets(
    output,
    offset,
    sourceX,
    sourceY,
    targetX,
    targetY,
    controlX,
    controlY,
    controlX,
    controlY,
    false,
    2,
    sourceStyle,
    targetStyle,
    visualScale,
  );
}

export function writeOwnedArrowCurveParameters(
  output: Float32Array,
  offset: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  curvature: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale = 1,
): void {
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance > 0 && curvature === 0) {
    writeStraightBoundaryOffsets(
      output,
      offset,
      deltaX,
      deltaY,
      distance,
      sourceStyle,
      targetStyle,
      visualScale,
    );
    return;
  }
  if (distance === 0) {
    writeSelfLoopBoundaryOffsets(
      output,
      offset,
      sourceX,
      sourceY,
      curvature,
      sourceStyle,
      targetStyle,
      visualScale,
    );
    return;
  }
  writeQuadraticBoundaryOffsets(
    output,
    offset,
    sourceX,
    sourceY,
    targetX,
    targetY,
    deltaX,
    deltaY,
    curvature,
    sourceStyle,
    targetStyle,
    visualScale,
  );
}
