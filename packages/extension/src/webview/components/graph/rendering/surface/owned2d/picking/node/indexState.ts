import type { FGNode } from '../../../../../model/build';
import { ownedGraphSpatialCellKey } from '../spatialHash';

const PICK_CELL_SIZE = 64;

export interface NodePickIndex {
  buckets: Map<number, number[]>;
  maximumNodeRadius: number;
}

export function rebuildNodePickIndex(
  index: NodePickIndex,
  nodes: readonly FGNode[],
  radius: (node: FGNode) => number,
): void {
  index.buckets.clear();
  index.maximumNodeRadius = 2;
  nodes.forEach((node, nodeIndex) => {
    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
    index.maximumNodeRadius = Math.max(index.maximumNodeRadius, radius(node));
    const x = Math.floor((node.x as number) / PICK_CELL_SIZE);
    const y = Math.floor((node.y as number) / PICK_CELL_SIZE);
    const key = ownedGraphSpatialCellKey(x, y);
    const bucket = index.buckets.get(key);
    if (bucket) bucket.push(nodeIndex);
    else index.buckets.set(key, [nodeIndex]);
  });
}

export function candidateNodeIndexes(
  buckets: ReadonlyMap<number, readonly number[]>,
  point: { x: number; y: number },
  queryRadius: number,
): Set<number> {
  const indexes = new Set<number>();
  const cellRadius = Math.max(1, Math.ceil(queryRadius / PICK_CELL_SIZE));
  const centerX = Math.floor(point.x / PICK_CELL_SIZE);
  const centerY = Math.floor(point.y / PICK_CELL_SIZE);
  for (let y = centerY - cellRadius; y <= centerY + cellRadius; y += 1) {
    for (let x = centerX - cellRadius; x <= centerX + cellRadius; x += 1) {
      for (const index of buckets.get(ownedGraphSpatialCellKey(x, y)) ?? []) indexes.add(index);
    }
  }
  return indexes;
}
