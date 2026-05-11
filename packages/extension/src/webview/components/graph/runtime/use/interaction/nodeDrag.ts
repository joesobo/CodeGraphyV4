import type { FGNode } from '../../../model/build';

export interface NodeDragTranslate {
  x: number;
  y: number;
}

export interface NodeDragGroupSession {
  draggedNodeIds: Set<string>;
  primaryNodeId: string;
}

type GraphMode = '2d' | '3d';

interface NodeDragGraphData {
  nodes: readonly FGNode[];
}

interface ApplyNodeDragOptions {
  graphData: NodeDragGraphData;
  graphMode: GraphMode;
  selectedNodeIds: ReadonlySet<string>;
}

interface NodeDragReleaseOptions {
  graphData: NodeDragGraphData;
  graphMode: GraphMode;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isFiniteTranslate(translate: NodeDragTranslate): boolean {
  return isFiniteNumber(translate.x) && isFiniteNumber(translate.y);
}

function createNodeMap(nodes: readonly FGNode[]): Map<string, FGNode> {
  return new Map(nodes.map(node => [node.id, node]));
}

export function markNodeDragging(node: FGNode): void {
  node.isDragging = true;
}

function releaseNodeDrag(node: FGNode, graphMode: GraphMode): void {
  node.isDragging = false;

  node.fx = undefined;
  node.fy = undefined;
  if (graphMode === '3d') {
    node.fz = undefined;
  }
}

function moveNodeByTranslate(node: FGNode, translate: NodeDragTranslate): void {
  if (!isFiniteTranslate(translate)) {
    return;
  }

  const x = (isFiniteNumber(node.x) ? node.x : 0) + translate.x;
  const y = (isFiniteNumber(node.y) ? node.y : 0) + translate.y;
  node.x = x;
  node.y = y;
  node.fx = x;
  node.fy = y;
  node.vx = 0;
  node.vy = 0;
}

function createDragGroupSession(
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

  return draggedNodeIds.size > 1
    ? { draggedNodeIds, primaryNodeId: primaryNode.id }
    : null;
}

export function applyNodeDrag(
  primaryNode: FGNode,
  translate: NodeDragTranslate,
  options: ApplyNodeDragOptions,
  session: NodeDragGroupSession | null = null,
): NodeDragGroupSession | null {
  markNodeDragging(primaryNode);

  const nextSession = session ?? createDragGroupSession(primaryNode, options);
  if (!nextSession || !isFiniteTranslate(translate)) {
    return nextSession;
  }

  const nodesById = createNodeMap(options.graphData.nodes);
  for (const nodeId of nextSession.draggedNodeIds) {
    const node = nodesById.get(nodeId);
    if (!node) {
      continue;
    }

    markNodeDragging(node);
    if (node.id !== primaryNode.id) {
      moveNodeByTranslate(node, translate);
    }
  }

  return nextSession;
}

function getDragEndNodes(
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

export function releaseDraggedNodes(
  primaryNode: FGNode,
  session: NodeDragGroupSession | null,
  options: NodeDragReleaseOptions,
): void {
  for (const node of getDragEndNodes(primaryNode, session, options.graphData)) {
    releaseNodeDrag(node, options.graphMode);
  }
}
