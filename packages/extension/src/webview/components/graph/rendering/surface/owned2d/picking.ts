import type { FGNode } from '../../../model/build';
import {
  getRectangularNodeArea2D,
  getRectangularNodeAreaRadius,
} from '../../../model/node/rectangularArea';
import { ownedGraphSpatialCellKey } from './spatialHash';
import { graphNodeDrawnArea, ownedGraphNodeWorldScale } from '@codegraphy-dev/graph-renderer';

const PICK_CELL_SIZE = 64;

function rectangularPointerArea(node: FGNode) {
  return getRectangularNodeArea2D(node.pointerArea2D)
    ?? getRectangularNodeArea2D(node.shapeSize2D);
}

function pointerRadius(node: FGNode): number {
  const rectangularArea = rectangularPointerArea(node);
  const rectangularRadius = rectangularArea
    ? getRectangularNodeAreaRadius(rectangularArea)
    : 0;
  return Math.max(2, rectangularRadius, node.size ?? 0);
}

function nodeDrawnArea(node: FGNode): number {
  const width = node.shapeSize2D?.width ?? (node.size ?? 0) * 2;
  const height = node.shapeSize2D?.height ?? (node.size ?? 0) * 2;
  return graphNodeDrawnArea(width, height);
}

function hitsNode(
  node: FGNode,
  dx: number,
  dy: number,
  distanceSquared: number,
  nodeVisualScale: number,
  screenPadding: number,
  minimumScreenRadius: number,
): boolean {
  const area = rectangularPointerArea(node);
  if (area) {
    return Math.abs(dx) <= area.width * nodeVisualScale / 2 + screenPadding
      && Math.abs(dy) <= area.height * nodeVisualScale / 2 + screenPadding;
  }
  const radius = Math.max(
    minimumScreenRadius,
    (node.size ?? 0) * nodeVisualScale + screenPadding,
  );
  return distanceSquared <= radius ** 2;
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
      const key = ownedGraphSpatialCellKey(x, y);
      const bucket = this.buckets.get(key);
      if (bucket) bucket.push(index);
      else this.buckets.set(key, [index]);
    }
  }

  pick(
    point: { x: number; y: number },
    globalScale: number,
  ): { index: number; node: FGNode } | undefined {
    let bestIndex = -1;
    let bestDrawnArea = Number.NEGATIVE_INFINITY;
    const safeScale = Math.max(globalScale, 0.01);
    const nodeVisualScale = ownedGraphNodeWorldScale(safeScale);
    const screenPadding = 2 / safeScale;
    const minimumScreenRadius = 4 / safeScale;
    const queryRadius = Math.max(
      this.maximumNodeRadius * nodeVisualScale + screenPadding,
      minimumScreenRadius,
    );
    const cellRadius = Math.max(1, Math.ceil(queryRadius / PICK_CELL_SIZE));
    const centerX = Math.floor(point.x / PICK_CELL_SIZE);
    const centerY = Math.floor(point.y / PICK_CELL_SIZE);

    for (let y = centerY - cellRadius; y <= centerY + cellRadius; y += 1) {
      for (let x = centerX - cellRadius; x <= centerX + cellRadius; x += 1) {
        for (const index of this.buckets.get(ownedGraphSpatialCellKey(x, y)) ?? []) {
          const node = this.nodes[index];
          const dx = point.x - (node.x as number);
          const dy = point.y - (node.y as number);
          const distanceSquared = dx * dx + dy * dy;
          const hit = hitsNode(
            node,
            dx,
            dy,
            distanceSquared,
            nodeVisualScale,
            screenPadding,
            minimumScreenRadius,
          );
          if (!hit) continue;
          const drawnArea = nodeDrawnArea(node);
          if (
            drawnArea > bestDrawnArea
            || (drawnArea === bestDrawnArea && index > bestIndex)
          ) {
            bestIndex = index;
            bestDrawnArea = drawnArea;
          }
        }
      }
    }
    return bestIndex < 0 ? undefined : { index: bestIndex, node: this.nodes[bestIndex] };
  }
}
