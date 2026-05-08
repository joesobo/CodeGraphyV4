import type { WebviewToExtensionMessage } from '../../../../../../shared/protocol/webviewToExtension';
import {
  findDeepestGraphLayoutSectionAtPoint,
  type GraphLayoutMode,
  type GraphLayoutSettings,
} from '../../../../../../shared/settings/graphLayout';
import type { FGNode } from '../../../model/build';
import { postMessage } from '../../../../../vscodeApi';
import { readNodePosition } from './positions';

type GraphLayoutOwnerDragMessage = Extract<
  WebviewToExtensionMessage,
  { type: 'UPDATE_GRAPH_LAYOUT_OWNER' }
>;

function createPinnedNodeDragMessage(
  node: FGNode,
  graphMode: GraphLayoutMode,
): WebviewToExtensionMessage | undefined {
  if (!node.isPinned) {
    return undefined;
  }

  const position = readNodePosition(node, graphMode);
  if (!position) {
    return undefined;
  }

  return {
    type: 'UPDATE_GRAPH_LAYOUT_PIN',
    payload: {
      graphMode,
      nodeId: node.id,
      position,
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
): GraphLayoutOwnerDragMessage | undefined {
  if (!canUpdateGraphLayoutOwnerOnDrag(graphLayout, graphMode, timelineActive)) {
    return undefined;
  }

  const position = readNodePosition(node, graphMode);
  if (!position) {
    return undefined;
  }

  const ownerSectionId = findDeepestGraphLayoutSectionAtPoint(graphLayout, position);
  const currentOwnerSectionId = graphLayout.ownership[node.id]?.ownerSectionId ?? null;
  if (ownerSectionId === currentOwnerSectionId) {
    return undefined;
  }

  return {
    type: 'UPDATE_GRAPH_LAYOUT_OWNER',
    payload: {
      itemId: node.id,
      itemKind: 'node',
      ownerSectionId,
    },
  };
}

export function markNodeDragging(node: FGNode): void {
  node.isDragging = true;
}

export function postNodeDragEndMessages(
  node: FGNode,
  graphLayout: GraphLayoutSettings | undefined,
  graphMode: GraphLayoutMode,
  timelineActive: boolean,
): void {
  const ownerMessage = createGraphLayoutOwnerDragMessage(
    node,
    graphLayout,
    graphMode,
    timelineActive,
  );
  if (ownerMessage) {
    node.ownerSectionId = ownerMessage.payload.ownerSectionId;
  }
  node.isDragging = false;

  const messages = [
    createPinnedNodeDragMessage(node, graphMode),
    ownerMessage,
  ];

  for (const message of messages) {
    if (message) {
      postMessage(message);
    }
  }
}
