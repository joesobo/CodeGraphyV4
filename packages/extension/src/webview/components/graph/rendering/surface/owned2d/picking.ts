import type { FGNode } from '../../../model/build';

const PICK_CELL_SIZE = 64;

function pointerRadius(node: FGNode): number {
  const rectangularRadius = Math.max(
    node.pointerArea2D?.width ?? 0,
    node.pointerArea2D?.height ?? 0,
    node.shapeSize2D?.width ?? 0,
    node.shapeSize2D?.height ?? 0,
  ) / 2;
  return Math.max(2, rectangularRadius, node.collisionRadius2D ?? 0, node.size ?? 0);
}

function cellKey(x: number, y: number): number {
  return Math.imul(x, 73_856_093) ^ Math.imul(y, 19_349_663);
}

export class OwnedGraphNodePicker {
  private readonly buckets = new Map<number, number[]>();
  private maximumNodeRadius = 2;
  private nodes: readonly FGNode[] = [];

  rebuild(nodes: readonly FGNode[]): void {
    this.nodes = nodes;
    this.buckets.clear();
    this.maximumNodeRadius = 2;
    for (let index = 0; index < nodes.length; index += 1) {
      const node = nodes[index];
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
      this.maximumNodeRadius = Math.max(this.maximumNodeRadius, pointerRadius(node));
      const x = Math.floor((node.x as number) / PICK_CELL_SIZE);
      const y = Math.floor((node.y as number) / PICK_CELL_SIZE);
      const key = cellKey(x, y);
      const bucket = this.buckets.get(key) ?? [];
      if (!this.buckets.has(key)) this.buckets.set(key, bucket);
      bucket.push(index);
    }
  }

  pick(
    point: { x: number; y: number },
    globalScale: number,
  ): { index: number; node: FGNode } | undefined {
    let bestIndex = -1;
    let bestDistanceSquared = Number.POSITIVE_INFINITY;
    const minimumScreenRadius = 4 / Math.max(globalScale, 0.01);
    const queryRadius = Math.max(this.maximumNodeRadius, minimumScreenRadius);
    const cellRadius = Math.max(1, Math.ceil(queryRadius / PICK_CELL_SIZE));
    const centerX = Math.floor(point.x / PICK_CELL_SIZE);
    const centerY = Math.floor(point.y / PICK_CELL_SIZE);
    const visited = new Set<number>();

    for (let y = centerY - cellRadius; y <= centerY + cellRadius; y += 1) {
      for (let x = centerX - cellRadius; x <= centerX + cellRadius; x += 1) {
        for (const index of this.buckets.get(cellKey(x, y)) ?? []) {
          if (visited.has(index)) continue;
          visited.add(index);
          const node = this.nodes[index];
          const dx = point.x - (node.x as number);
          const dy = point.y - (node.y as number);
          const distanceSquared = dx * dx + dy * dy;
          const radius = Math.max(pointerRadius(node), minimumScreenRadius);
          if (distanceSquared <= radius * radius && distanceSquared < bestDistanceSquared) {
            bestIndex = index;
            bestDistanceSquared = distanceSquared;
          }
        }
      }
    }
    return bestIndex < 0 ? undefined : { index: bestIndex, node: this.nodes[bestIndex] };
  }
}

export function pickOwnedGraphNode(
  nodes: readonly FGNode[],
  point: { x: number; y: number },
  globalScale: number,
): { index: number; node: FGNode } | undefined {
  const picker = new OwnedGraphNodePicker();
  picker.rebuild(nodes);
  return picker.pick(point, globalScale);
}
