import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import {
  findDeepestGraphLayoutSectionAtWorldPoint,
  isGraphLayoutSectionDescendant,
  type GraphLayoutMode,
  type GraphLayoutOwnershipUpdate,
  type GraphLayoutSettings,
} from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { postMessage } from '../../../../../vscodeApi';
import { readNodePosition } from './positions';

type GraphLayoutOwnerDragMessage = Extract<
  WebviewToExtensionMessage,
  { type: 'UPDATE_GRAPH_LAYOUT_OWNER' }
>;

export interface NodeDragTranslate {
  x: number;
  y: number;
}

export interface NodeDragGroupSession {
  draggedNodeIds: Set<string>;
  primaryNodeId: string;
}

interface NodeDragGraphData {
  nodes: readonly FGNode[];
}

interface ApplyNodeDragOptions {
  graphData: NodeDragGraphData;
  graphMode: GraphLayoutMode;
  selectedNodeIds: ReadonlySet<string>;
}

interface NodeDragEndOptions {
  graphData: NodeDragGraphData;
  graphLayout: GraphLayoutSettings | undefined;
  graphMode: GraphLayoutMode;
  timelineActive: boolean;
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

function readLiveSectionDimension(
  value: unknown,
  fallback: number,
): number {
  return isFiniteNumber(value) ? value : fallback;
}

function getSectionWorldTopLeft(
  graphLayout: GraphLayoutSettings,
  sectionId: string,
  visited = new Set<string>(),
): { x: number; y: number } | undefined {
  const section = graphLayout.sections[sectionId];
  if (!section) {
    return undefined;
  }

  if (visited.has(sectionId)) {
    return { x: section.x, y: section.y };
  }

  const ownerSectionId = graphLayout.ownership[sectionId]?.ownerSectionId ?? null;
  if (!ownerSectionId) {
    return { x: section.x, y: section.y };
  }

  visited.add(sectionId);
  const ownerTopLeft = getSectionWorldTopLeft(graphLayout, ownerSectionId, visited);
  return ownerTopLeft
    ? { x: ownerTopLeft.x + section.x, y: ownerTopLeft.y + section.y }
    : { x: section.x, y: section.y };
}

function createLiveGraphLayout(
  graphLayout: GraphLayoutSettings,
  graphNodes: readonly FGNode[] | undefined,
): GraphLayoutSettings {
  if (!graphNodes || graphNodes.length === 0) {
    return graphLayout;
  }

  const sections = { ...graphLayout.sections };
  for (const node of graphNodes) {
    if (!node.isGraphSection || node.isCollapsedGraphSection) {
      continue;
    }

    const section = sections[node.id];
    if (!section) {
      continue;
    }

    const height = readLiveSectionDimension(node.sectionHeight, section.height);
    const width = readLiveSectionDimension(node.sectionWidth, section.width);
    const centerX = isFiniteNumber(node.x) ? node.x : undefined;
    const centerY = isFiniteNumber(node.y) ? node.y : undefined;
    sections[node.id] = {
      ...section,
      height,
      width,
      x: centerX === undefined ? section.x : centerX - (width / 2),
      y: centerY === undefined ? section.y : centerY - (height / 2),
    };
  }

  return { ...graphLayout, sections };
}

function getGraphLayoutItemKind(node: FGNode): GraphLayoutOwnershipUpdate['itemKind'] {
  return node.isGraphSection ? 'section' : 'node';
}

function createOwnershipCandidateGraphLayout(
  graphLayout: GraphLayoutSettings,
  node: FGNode,
): GraphLayoutSettings {
  if (!node.isGraphSection) {
    return graphLayout;
  }

  const sections = { ...graphLayout.sections };
  for (const sectionId of Object.keys(sections)) {
    if (
      sectionId === node.id
      || isGraphLayoutSectionDescendant(graphLayout.ownership, sectionId, node.id)
    ) {
      delete sections[sectionId];
    }
  }

  return { ...graphLayout, sections };
}

function createPinnedNodeDragMessage(
  node: FGNode,
  graphMode: GraphLayoutMode,
  graphLayout: GraphLayoutSettings | undefined,
  graphNodes: readonly FGNode[] | undefined,
): WebviewToExtensionMessage | undefined {
  if (!node.isPinned) {
    return undefined;
  }

  const position = readNodePosition(node, graphMode);
  if (!position) {
    return undefined;
  }

  const liveGraphLayout = graphLayout ? createLiveGraphLayout(graphLayout, graphNodes) : undefined;
  const ownerSectionId = liveGraphLayout
    ? (node.ownerSectionId ?? liveGraphLayout.ownership[node.id]?.ownerSectionId ?? null)
    : null;
  const ownerTopLeft = graphMode === '2d' && liveGraphLayout && ownerSectionId
    ? getSectionWorldTopLeft(liveGraphLayout, ownerSectionId)
    : undefined;
  const persistedPosition = ownerTopLeft
    ? { x: position.x - ownerTopLeft.x, y: position.y - ownerTopLeft.y }
    : position;

  return {
    type: 'UPDATE_GRAPH_LAYOUT_PIN',
    payload: {
      graphMode,
      nodeId: node.id,
      position: persistedPosition,
    },
  };
}

function canUpdateGraphLayoutOwnerOnDrag(
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
): graphLayout is GraphLayoutSettings {
  return !!graphLayout && graphMode === '2d' && !timelineActive;
}

function createGraphLayoutOwnerDragMessage(
  node: FGNode,
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
  graphNodes?: readonly FGNode[],
): GraphLayoutOwnerDragMessage | undefined {
  if (!canUpdateGraphLayoutOwnerOnDrag(graphLayout, graphMode, timelineActive)) {
    return undefined;
  }

  const position = readNodePosition(node, graphMode);
  if (!position) {
    return undefined;
  }

  const liveGraphLayout = createLiveGraphLayout(graphLayout, graphNodes);
  const ownerCandidateGraphLayout = createOwnershipCandidateGraphLayout(liveGraphLayout, node);
  const ownerSectionId = findDeepestGraphLayoutSectionAtWorldPoint(ownerCandidateGraphLayout, position);
  const currentOwnerSectionId = graphLayout.ownership[node.id]?.ownerSectionId ?? null;
  if (ownerSectionId === currentOwnerSectionId) {
    return undefined;
  }

  return {
    type: 'UPDATE_GRAPH_LAYOUT_OWNER',
    payload: {
      itemId: node.id,
      itemKind: getGraphLayoutItemKind(node),
      ownerSectionId,
    },
  };
}

export function markNodeDragging(node: FGNode): void {
  node.isDragging = true;
}

function releaseNodeDrag(node: FGNode, graphMode: GraphLayoutMode): void {
  node.isDragging = false;

  if (node.isPinned) {
    return;
  }

  if (graphMode === '2d') {
    node.fx = undefined;
    node.fy = undefined;
  } else {
    node.fx = undefined;
    node.fy = undefined;
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

export function postNodeDragEndMessages(
  node: FGNode,
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
  graphNodes?: readonly FGNode[],
): void {
  const ownerMessage = createGraphLayoutOwnerDragMessage(
    node,
    graphLayout,
    graphMode,
    timelineActive,
    graphNodes,
  );
  if (ownerMessage) {
    node.ownerSectionId = ownerMessage.payload.ownerSectionId;
  }
  releaseNodeDrag(node, graphMode);

  const messages = [
    createPinnedNodeDragMessage(node, graphMode, graphLayout, graphNodes),
    ownerMessage,
  ];

  for (const message of messages) {
    if (message) {
      postMessage(message);
    }
  }
}

export function updateNodeDragOwnerPreview(
  node: FGNode,
  options: NodeDragEndOptions,
): string | null {
  if (!canUpdateGraphLayoutOwnerOnDrag(options.graphLayout, options.graphMode, options.timelineActive)) {
    return null;
  }

  const position = readNodePosition(node, options.graphMode);
  if (!position) {
    return null;
  }

  const liveGraphLayout = createLiveGraphLayout(options.graphLayout, options.graphData.nodes);
  const ownerCandidateGraphLayout = createOwnershipCandidateGraphLayout(liveGraphLayout, node);
  return findDeepestGraphLayoutSectionAtWorldPoint(ownerCandidateGraphLayout, position);
}

export function postDraggedNodesDragEndMessages(
  primaryNode: FGNode,
  session: NodeDragGroupSession | null,
  options: NodeDragEndOptions,
): void {
  for (const node of getDragEndNodes(primaryNode, session, options.graphData)) {
    postNodeDragEndMessages(
      node,
      options.graphLayout,
      options.graphMode,
      options.timelineActive,
      options.graphData.nodes,
    );
  }
}
