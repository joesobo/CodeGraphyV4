import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { FGNode } from '../../../model/build';
import { createDragGroupSession, getDragEndNodes } from './nodeDrag/group';
import { releaseNodeDrag } from './nodeDrag/policy';
import { isFiniteTranslate, moveNodeByTranslate, stopNodeMotion } from './nodeDrag/position';
import type {
  ApplyNodeDragOptions,
  GraphMode,
  NodeDragEndOptions,
  NodeDragGroupSession,
  NodeDragTranslate,
} from './nodeDrag/types';

export type {
  NodeDragGroupSession,
  NodeDragTranslate,
};

export function markNodeDragging(node: FGNode): void {
  node.isDragging = true;
}

function stopPinned2dNodeMotion(
  node: FGNode,
  options: Pick<ApplyNodeDragOptions, 'graphMode'>,
): void {
  if (options.graphMode === '2d' && node.isPinned === true) {
    stopNodeMotion(node);
  }
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
    if (node) {
      markNodeDragging(node);
    }
    if (node && node.id !== primaryNode.id) {
      moveNodeByTranslate(node, translate);
    }
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
  if (!isFiniteTranslate(translate)) {
    return nextSession;
  }

  stopPinned2dNodeMotion(primaryNode, options);

  if (!nextSession) {
    return nextSession;
  }

  moveDraggedSessionNodes(primaryNode, translate, options, nextSession);
  return nextSession;
}

export function postNodeDragEndMessages(
  node: FGNode,
  graphMode: GraphMode,
  graphViewContributions?: Pick<CoreGraphViewContributionSet, 'nodeDragEnd'>,
  options: {
    graphData?: NodeDragEndOptions['graphData'];
  } = {},
): void {
  releaseNodeDrag(node, graphMode, {
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
      options.graphMode,
      options.graphViewContributions,
      { graphData: options.graphData },
    );
  }
}
