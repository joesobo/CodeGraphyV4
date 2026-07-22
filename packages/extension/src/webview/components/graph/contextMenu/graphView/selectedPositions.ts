import type {
  GraphContextMenuNode,
  GraphContextSelection,
} from '../contracts';
import { isFiniteNumber } from '../../runtime/physics/numeric';

export function createSelectedNodePositions(
  selection: GraphContextSelection,
  nodes: readonly GraphContextMenuNode[] | undefined,
): Readonly<Record<string, { x: number; y: number }>> | undefined {
  if (selection.kind !== 'node' || !nodes?.length) return undefined;

  const nodesById = new Map(nodes.map(node => [node.id, node]));
  const positions: Record<string, { x: number; y: number }> = {};
  for (const nodeId of selection.targets) {
    const node = nodesById.get(nodeId);
    if (!isFiniteNumber(node?.x) || !isFiniteNumber(node.y)) continue;
    positions[nodeId] = { x: node.x, y: node.y };
  }

  return Object.keys(positions).length > 0 ? positions : undefined;
}
