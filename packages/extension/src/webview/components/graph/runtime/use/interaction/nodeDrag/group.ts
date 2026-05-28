import type { FGNode } from '../../../../model/build';
import type {
  ApplyNodeDragOptions,
  NodeDragGraphData,
  NodeDragGroupSession,
  NodeDragPositionOrigin,
} from './types';
import { readNodePositionOrigin } from './position';

export function createNodeMap(nodes: readonly FGNode[]): Map<string, FGNode> {
  return new Map(nodes.map(node => [node.id, node]));
}

export function createDragGroupSession(
  primaryNode: FGNode,
  options: ApplyNodeDragOptions,
): NodeDragGroupSession | null {
  if (
    options.graphMode !== '2d'
    || !options.selectedNodeIds.has(primaryNode.id)
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

  const nodeOrigins = new Map<string, NodeDragPositionOrigin>();
  for (const nodeId of draggedNodeIds) {
    const node = nodesById.get(nodeId);
    if (node) {
      nodeOrigins.set(nodeId, readNodePositionOrigin(node));
    }
  }

  return draggedNodeIds.size > 1
    ? { draggedNodeIds, nodeOrigins, primaryNodeId: primaryNode.id }
    : null;
}

export function createPinnedNodeDragSession(
  primaryNode: FGNode,
  options: ApplyNodeDragOptions,
): NodeDragGroupSession | null {
  if (options.graphMode !== '2d' || primaryNode.isPinned !== true) {
    return null;
  }

  return {
    draggedNodeIds: new Set([primaryNode.id]),
    nodeOrigins: new Map([[primaryNode.id, readNodePositionOrigin(primaryNode)]]),
    primaryNodeId: primaryNode.id,
  };
}

export function createNodeDragSession(
  primaryNode: FGNode,
  options: ApplyNodeDragOptions,
): NodeDragGroupSession | null {
  return createDragGroupSession(primaryNode, options)
    ?? createPinnedNodeDragSession(primaryNode, options);
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
