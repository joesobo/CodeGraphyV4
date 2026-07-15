import type { FGNode } from '../../../model/build';
import { candidateNodeIndexes, rebuildNodePickIndex, type NodePickIndex } from './pickingIndex';
import { nodeDrawnArea, nodeHitMetrics, nodeHitsPoint, pointerRadius } from './pickingMetrics';

export class OwnedGraphNodePicker {
  private readonly index: NodePickIndex = { buckets: new Map(), maximumNodeRadius: 2 };
  private nodes: readonly FGNode[] = [];

  rebuild(nodes: readonly FGNode[]): void {
    this.nodes = nodes;
    rebuildNodePickIndex(this.index, nodes, pointerRadius);
  }

  pick(point: { x: number; y: number }, globalScale: number): { index: number; node: FGNode } | undefined {
    const metrics = nodeHitMetrics(this.index.maximumNodeRadius, globalScale);
    let bestIndex = -1;
    let bestArea = Number.NEGATIVE_INFINITY;
    for (const index of candidateNodeIndexes(this.index.buckets, point, metrics.queryRadius)) {
      const node = this.nodes[index];
      if (!nodeHitsPoint(node, point, metrics)) continue;
      const area = nodeDrawnArea(node);
      if (area > bestArea || (area === bestArea && index > bestIndex)) {
        bestIndex = index;
        bestArea = area;
      }
    }
    return bestIndex < 0 ? undefined : { index: bestIndex, node: this.nodes[bestIndex] };
  }
}
