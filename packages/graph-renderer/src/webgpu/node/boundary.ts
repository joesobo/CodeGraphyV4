import type { GraphRendererNodeStyle } from '../../contracts';
import { ellipseBoundary, starBoundary } from '../boundary/radial';
import { rectangleBoundary } from '../boundary/rectangle';

export function nodeBoundaryDistance(
  style: GraphRendererNodeStyle,
  directionX: number,
  directionY: number,
  visualScale: number,
): number {
  const halfWidth = Math.max(0.5, style.width * visualScale / 2);
  const halfHeight = Math.max(0.5, style.height * visualScale / 2);
  const localX = directionX / halfWidth;
  const localY = directionY / halfHeight;
  switch (style.shape) {
    case 'circle': return ellipseBoundary(halfWidth, halfHeight, directionX, directionY);
    case 'rectangle':
    case 'square':
      return rectangleBoundary(
        halfWidth,
        halfHeight,
        style.cornerRadius * visualScale,
        directionX,
        directionY,
      );
    case 'diamond': return 1 / (Math.abs(localX) + Math.abs(localY));
    case 'triangle':
      return 0.5 / Math.max(Math.abs(localX) * 0.866025 - localY * 0.5, localY);
    case 'hexagon':
      return 1 / Math.max(
        Math.abs(localX) * 0.866025 + Math.abs(localY) * 0.5,
        Math.abs(localY),
      );
    case 'star': return starBoundary(halfWidth, halfHeight, directionX, directionY);
  }
}
