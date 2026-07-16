import { ownedGraphSpatialCellKey } from '../spatialHash';

const CELL_SIZE = 128;

export function collectLinkPickCandidates(buckets: ReadonlyMap<number, readonly number[]>, point: { x: number; y: number }, radius: number): Set<number> {
  const result = new Set<number>();
  const minimumX = Math.floor((point.x - radius) / CELL_SIZE);
  const maximumX = Math.floor((point.x + radius) / CELL_SIZE);
  const minimumY = Math.floor((point.y - radius) / CELL_SIZE);
  const maximumY = Math.floor((point.y + radius) / CELL_SIZE);
  for (let y = minimumY; y <= maximumY; y += 1) {
    for (let x = minimumX; x <= maximumX; x += 1) {
      for (const index of buckets.get(ownedGraphSpatialCellKey(x, y)) ?? []) result.add(index);
    }
  }
  return result;
}
