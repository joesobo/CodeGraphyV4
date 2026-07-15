import { resolveGraphLinkGeometry, pointOnGraphLink } from '@codegraphy-dev/graph-renderer';
import type { FGLink } from '../../../model/build';

const CURVE_SEGMENTS = 12;

function pointToSegmentDistance(
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const position = Math.max(0, Math.min(1,
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + position * dx), point.y - (start.y + position * dy));
}

export function distanceToOwnedLink(link: FGLink, point: { x: number; y: number }): number {
  const geometry = resolveGraphLinkGeometry(link);
  if (!geometry) return Number.POSITIVE_INFINITY;
  let previous = pointOnGraphLink(geometry, 0);
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let segment = 1; segment <= CURVE_SEGMENTS; segment += 1) {
    const next = pointOnGraphLink(geometry, segment / CURVE_SEGMENTS);
    minimumDistance = Math.min(minimumDistance, pointToSegmentDistance(point, previous, next));
    previous = next;
  }
  return minimumDistance;
}
