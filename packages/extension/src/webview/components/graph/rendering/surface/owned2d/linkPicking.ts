import type { FGLink } from '../../../model/build';
import { ownedLinkGeometry, pointOnOwnedLink } from './linkGeometry';

export interface OwnedGraphLinkPick {
  distance: number;
  index: number;
  link: FGLink;
}

const CURVE_SEGMENTS = 12;
const LINK_PICK_CELL_SIZE = 128;
const MINIMUM_SCREEN_PICK_DISTANCE = 6;

function cellKey(x: number, y: number): number {
  return Math.imul(x, 73_856_093) ^ Math.imul(y, 19_349_663);
}

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

  rebuild(links: readonly FGLink[]): void {
    this.links = links;
    this.buckets.clear();
    for (let index = 0; index < links.length; index += 1) {
      const geometry = ownedLinkGeometry(links[index]);
      if (!geometry) continue;
      const xValues = [
        geometry.source.x as number,
        geometry.target.x as number,
        geometry.controlX,
      ];
      const yValues = [
        geometry.source.y as number,
        geometry.target.y as number,
        geometry.controlY,
      ];
      if (geometry.secondControlX !== undefined && geometry.secondControlY !== undefined) {
        xValues.push(geometry.secondControlX);
        yValues.push(geometry.secondControlY);
      }
      const minimumX = Math.floor(Math.min(...xValues) / LINK_PICK_CELL_SIZE);
      const maximumX = Math.floor(Math.max(...xValues) / LINK_PICK_CELL_SIZE);
      const minimumY = Math.floor(Math.min(...yValues) / LINK_PICK_CELL_SIZE);
      const maximumY = Math.floor(Math.max(...yValues) / LINK_PICK_CELL_SIZE);
      for (let y = minimumY; y <= maximumY; y += 1) {
        for (let x = minimumX; x <= maximumX; x += 1) {
          const key = cellKey(x, y);
          const bucket = this.buckets.get(key) ?? [];
          if (!this.buckets.has(key)) this.buckets.set(key, bucket);
          bucket.push(index);
        }
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
        for (const index of this.buckets.get(cellKey(x, y)) ?? []) candidates.add(index);
      }
    }
    let nearest: OwnedGraphLinkPick | undefined;
    for (const index of [...candidates].sort((left, right) => left - right)) {
      const distance = distanceToOwnedLink(this.links[index], point);
      if (distance > maximumDistance || (nearest && distance >= nearest.distance)) continue;
      nearest = { distance, index, link: this.links[index] };
    }
    return nearest;
  }
}

export function pickOwnedGraphLink(
  links: readonly FGLink[],
  point: { x: number; y: number },
  zoom: number,
): OwnedGraphLinkPick | undefined {
  const picker = new OwnedGraphLinkPicker();
  picker.rebuild(links);
  return picker.pick(point, zoom);
}
