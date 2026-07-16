import type { GraphRendererNodeStyle } from '../../contracts';
import { nodeBoundaryDistance } from '../node/boundary';

export function writeStraightArrowBoundary(
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
