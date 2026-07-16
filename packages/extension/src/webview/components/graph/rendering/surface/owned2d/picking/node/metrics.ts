import { graphNodeWorldScale } from '@codegraphy-dev/graph-renderer';
import type { FGNode } from '../../../../../model/build';
import { ownedNodePointerArea, ownedNodePointerRadius } from './pointerArea';

export interface NodeHitMetrics {
  minimumScreenRadius: number;
  nodeVisualScale: number;
  queryRadius: number;
  screenPadding: number;
}

export function pointerRadius(node: FGNode): number {
  return Math.max(2, ownedNodePointerRadius(node), node.size ?? 0);
}

export { nodeDrawnArea } from './drawnArea';

export function nodeHitMetrics(maximumNodeRadius: number, globalScale: number): NodeHitMetrics {
  const safeScale = Math.max(globalScale, 0.01);
  const nodeVisualScale = graphNodeWorldScale(safeScale);
  const screenPadding = 2 / safeScale;
  const minimumScreenRadius = 4 / safeScale;
  return {
    minimumScreenRadius,
    nodeVisualScale,
    queryRadius: Math.max(maximumNodeRadius * nodeVisualScale + screenPadding, minimumScreenRadius),
    screenPadding,
  };
}

export function nodeHitsPoint(node: FGNode, point: { x: number; y: number }, metrics: NodeHitMetrics): boolean {
  const dx = point.x - (node.x as number);
  const dy = point.y - (node.y as number);
  const area = ownedNodePointerArea(node);
  if (area) {
    return Math.abs(dx) <= area.width * metrics.nodeVisualScale / 2 + metrics.screenPadding
      && Math.abs(dy) <= area.height * metrics.nodeVisualScale / 2 + metrics.screenPadding;
  }
  const radius = Math.max(metrics.minimumScreenRadius,
    (node.size ?? 0) * metrics.nodeVisualScale + metrics.screenPadding);
  return dx * dx + dy * dy <= radius ** 2;
}
