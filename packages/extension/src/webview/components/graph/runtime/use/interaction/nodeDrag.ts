import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { FGNode } from '../../../model/build';
import { createDragGroupSession, getDragEndNodes } from './nodeDrag/group';
import { releaseNodeDrag } from './nodeDrag/policy';
import { isFiniteTranslate, moveNodeByTranslate, stopNodeMotion } from './nodeDrag/position';
import type {
  ApplyNodeDragOptions,
  NodeDragEndOptions,
  NodeDragGroupSession,
  NodeDragTranslate,
} from './nodeDrag/types';

export type { NodeDragGroupSession, NodeDragTranslate };

export function markNodeDragging(node: FGNode): void {
  node.isDragging = true;
}

function stopPinnedNodeMotion(node: FGNode): void {
  if (node.isPinned === true) stopNodeMotion(node);
}

function moveDraggedSessionNodes(
  primaryNode: FGNode,
  translate: NodeDragTranslate,
  options: ApplyNodeDragOptions,
  session: NodeDragGroupSession,
): void {
  const nodesById = new Map(options.graphData.nodes.map(node => [node.id, node]));
  for (const nodeId of session.draggedNodeIds) {
    const node = nodesById.get(nodeId);
    if (node) markNodeDragging(node);
    if (node && node.id !== primaryNode.id) moveNodeByTranslate(node, translate);
  }
}

export function applyNodeDrag(
  primaryNode: FGNode,
  translate: NodeDragTranslate,
  options: ApplyNodeDragOptions,
  session: NodeDragGroupSession | null = null,
): NodeDragGroupSession | null {
  markNodeDragging(primaryNode);

  const nextSession = session ?? createDragGroupSession(primaryNode, options);
  if (!isFiniteTranslate(translate)) return nextSession;

  stopPinnedNodeMotion(primaryNode);
  if (!nextSession) return nextSession;

  moveDraggedSessionNodes(primaryNode, translate, options, nextSession);
  return nextSession;
}

export function postNodeDragEndMessages(
  node: FGNode,
  graphViewContributions?: Pick<ExtensionGraphViewContributionSet, 'nodeDragEnd'>,
  options: {
    graphData?: NodeDragEndOptions['graphData'];
  } = {},
): void {
  releaseNodeDrag(node, {
    ...options,
    graphViewContributions,
  });
}

export function postDraggedNodesDragEndMessages(
  primaryNode: FGNode,
  session: NodeDragGroupSession | null,
  options: NodeDragEndOptions,
): void {
  for (const node of getDragEndNodes(primaryNode, session, options.graphData)) {
    postNodeDragEndMessages(
      node,
      options.graphViewContributions,
      { graphData: options.graphData },
    );
  }
}
