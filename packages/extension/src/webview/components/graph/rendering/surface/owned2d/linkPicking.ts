import type { FGLink } from '../../../model/build';
import { ownedLinkGeometry, pointOnOwnedLink } from './linkGeometry';

export interface OwnedGraphLinkPick {
  distance: number;
  index: number;
  link: FGLink;
}

const CURVE_SEGMENTS = 12;
const MINIMUM_SCREEN_PICK_DISTANCE = 6;

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
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared,
  ));
  return Math.hypot(
    point.x - (start.x + position * dx),
    point.y - (start.y + position * dy),
  );
}

export function distanceToOwnedLink(
  link: FGLink,
  point: { x: number; y: number },
): number {
  const geometry = ownedLinkGeometry(link);
  if (!geometry) return Number.POSITIVE_INFINITY;
  let previous = pointOnOwnedLink(geometry, 0);
  let minimumDistance = Number.POSITIVE_INFINITY;
  for (let segment = 1; segment <= CURVE_SEGMENTS; segment += 1) {
    const next = pointOnOwnedLink(geometry, segment / CURVE_SEGMENTS);
    minimumDistance = Math.min(minimumDistance, pointToSegmentDistance(point, previous, next));
    previous = next;
  }
  return minimumDistance;
}

export function pickOwnedGraphLink(
  links: readonly FGLink[],
  point: { x: number; y: number },
  zoom: number,
): OwnedGraphLinkPick | undefined {
  const maximumDistance = MINIMUM_SCREEN_PICK_DISTANCE / Math.max(zoom, 0.0001);
  let nearest: OwnedGraphLinkPick | undefined;
  for (let index = 0; index < links.length; index += 1) {
    const distance = distanceToOwnedLink(links[index], point);
    if (distance > maximumDistance || (nearest && distance >= nearest.distance)) continue;
    nearest = { distance, index, link: links[index] };
  }
  return nearest;
}
