import { ownedGraphSpatialCellKey } from '../spatialHash';
import { advanceLinkGridWalk, createLinkGridWalk } from './grid';

const CELL_SIZE = 128;
export type LinkPickBuckets = Map<number, number[]>;

function insertCell(buckets: LinkPickBuckets, index: number, x: number, y: number): number {
  const key = ownedGraphSpatialCellKey(x, y);
  const bucket = buckets.get(key);
  if (!bucket) { buckets.set(key, [index]); return 1; }
  if (bucket[bucket.length - 1] === index) return 0;
  bucket.push(index);
  return 1;
}

export function indexLinkSegment(buckets: LinkPickBuckets, index: number, start: { x: number; y: number }, end: { x: number; y: number }): number {
  const walk = createLinkGridWalk(start, end, CELL_SIZE);
  let added = insertCell(buckets, index, walk.x, walk.y);
  while (walk.x !== walk.endX || walk.y !== walk.endY) {
    advanceLinkGridWalk(walk);
    added += insertCell(buckets, index, walk.x, walk.y);
  }
  return added;
}
export { collectLinkPickCandidates } from './candidates';
