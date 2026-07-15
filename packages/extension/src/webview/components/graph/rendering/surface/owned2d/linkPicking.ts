import type { FGLink } from '../../../model/build';
import { ownedLinkGeometry, pointOnOwnedLink } from './linkGeometry';
import { ownedGraphSpatialCellKey } from './spatialHash';

export interface OwnedGraphLinkPick {
  distance: number;
  index: number;
  link: FGLink;
}

const CURVE_SEGMENTS = 12;
const LINK_PICK_CELL_SIZE = 128;
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

export class OwnedGraphLinkPicker {
  private readonly buckets = new Map<number, number[]>();
  private links: readonly FGLink[] = [];
  private entryCount = 0;

  get indexedEntryCount(): number {
    return this.entryCount;
  }

  private insertCell(index: number, x: number, y: number): void {
    const key = ownedGraphSpatialCellKey(x, y);
    const bucket = this.buckets.get(key);
    if (!bucket) {
      this.buckets.set(key, [index]);
      this.entryCount += 1;
      return;
    }
    if (bucket[bucket.length - 1] === index) return;
    bucket.push(index);
    this.entryCount += 1;
  }

  private insertSegment(
    index: number,
    start: { x: number; y: number },
    end: { x: number; y: number },
  ): void {
    let x = Math.floor(start.x / LINK_PICK_CELL_SIZE);
    let y = Math.floor(start.y / LINK_PICK_CELL_SIZE);
    const endX = Math.floor(end.x / LINK_PICK_CELL_SIZE);
    const endY = Math.floor(end.y / LINK_PICK_CELL_SIZE);
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const stepX = Math.sign(deltaX);
    const stepY = Math.sign(deltaY);
    const nextBoundaryX = (x + (stepX > 0 ? 1 : 0)) * LINK_PICK_CELL_SIZE;
    const nextBoundaryY = (y + (stepY > 0 ? 1 : 0)) * LINK_PICK_CELL_SIZE;
    let maximumX = stepX === 0 ? Number.POSITIVE_INFINITY : (nextBoundaryX - start.x) / deltaX;
    let maximumY = stepY === 0 ? Number.POSITIVE_INFINITY : (nextBoundaryY - start.y) / deltaY;
    const incrementX = stepX === 0
      ? Number.POSITIVE_INFINITY
      : LINK_PICK_CELL_SIZE / Math.abs(deltaX);
    const incrementY = stepY === 0
      ? Number.POSITIVE_INFINITY
      : LINK_PICK_CELL_SIZE / Math.abs(deltaY);
    this.insertCell(index, x, y);
    while (x !== endX || y !== endY) {
      if (maximumX < maximumY) {
        x += stepX;
        maximumX += incrementX;
      } else if (maximumY < maximumX) {
        y += stepY;
        maximumY += incrementY;
      } else {
        x += stepX;
        y += stepY;
        maximumX += incrementX;
        maximumY += incrementY;
      }
      this.insertCell(index, x, y);
    }
  }

  rebuild(links: readonly FGLink[]): void {
    this.links = links;
    this.buckets.clear();
    this.entryCount = 0;
    for (let index = 0; index < links.length; index += 1) {
      const geometry = ownedLinkGeometry(links[index]);
      if (!geometry) continue;
      let previous = pointOnOwnedLink(geometry, 0);
      for (let segment = 1; segment <= CURVE_SEGMENTS; segment += 1) {
        const next = pointOnOwnedLink(geometry, segment / CURVE_SEGMENTS);
        this.insertSegment(index, previous, next);
        previous = next;
      }
    }
  }

  pick(
    point: { x: number; y: number },
    zoom: number,
  ): OwnedGraphLinkPick | undefined {
    const maximumDistance = MINIMUM_SCREEN_PICK_DISTANCE / Math.max(zoom, 0.0001);
    const minimumX = Math.floor((point.x - maximumDistance) / LINK_PICK_CELL_SIZE);
    const maximumX = Math.floor((point.x + maximumDistance) / LINK_PICK_CELL_SIZE);
    const minimumY = Math.floor((point.y - maximumDistance) / LINK_PICK_CELL_SIZE);
    const maximumY = Math.floor((point.y + maximumDistance) / LINK_PICK_CELL_SIZE);
    const candidates = new Set<number>();
    for (let y = minimumY; y <= maximumY; y += 1) {
      for (let x = minimumX; x <= maximumX; x += 1) {
        for (const index of this.buckets.get(ownedGraphSpatialCellKey(x, y)) ?? []) {
          candidates.add(index);
        }
      }
    }
    let nearest: OwnedGraphLinkPick | undefined;
    for (const index of candidates) {
      const distance = distanceToOwnedLink(this.links[index], point);
      const closer = !nearest || distance < nearest.distance;
      const earlierTie = nearest !== undefined
        && distance === nearest.distance
        && index < nearest.index;
      if (distance <= maximumDistance && (closer || earlierTie)) {
        nearest = { distance, index, link: this.links[index] };
      }
    }
    return nearest;
  }
}
