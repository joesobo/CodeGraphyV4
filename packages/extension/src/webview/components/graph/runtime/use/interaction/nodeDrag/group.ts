import type { FGNode } from '../../../../model/build';
import type { ApplyNodeDragOptions, NodeDragGraphData, NodeDragGroupSession } from './types';

export function createNodeMap(nodes: readonly FGNode[]): Map<string, FGNode> {
  return new Map(nodes.map(node => [node.id, node]));
}

export function createDragGroupSession(
  primaryNode: FGNode,
  options: ApplyNodeDragOptions,
): NodeDragGroupSession | null {
  if (
    !options.selectedNodeIds.has(primaryNode.id)
    || options.selectedNodeIds.size < 2
  ) {
    return null;
  }

  const nodesById = createNodeMap(options.graphData.nodes);
  const draggedNodeIds = new Set<string>();
  for (const nodeId of options.selectedNodeIds) {
    if (nodesById.has(nodeId)) {
      draggedNodeIds.add(nodeId);
    }
  }

  return draggedNodeIds.size > 1
    ? { draggedNodeIds, primaryNodeId: primaryNode.id }
    : null;
}

export function getDragEndNodes(
  primaryNode: FGNode,
  session: NodeDragGroupSession | null,
  graphData: NodeDragGraphData,
): FGNode[] {
  if (!session) {
    return [primaryNode];
  }

  const nodesById = createNodeMap(graphData.nodes);
  const nodes: FGNode[] = [];
  for (const nodeId of session.draggedNodeIds) {
    const node = nodeId === primaryNode.id ? primaryNode : nodesById.get(nodeId);
    if (node) {
      nodes.push(node);
    }
  }

  return nodes;
}
