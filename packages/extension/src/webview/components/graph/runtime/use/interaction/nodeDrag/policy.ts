import type { FGNode } from '../../../../model/build';
import type { GraphMode, NodeDragPolicyContext } from './types';

export function shouldKeepFixedPosition(
  node: FGNode,
  options: NodeDragPolicyContext,
): boolean {
  for (const entry of options.graphViewContributions?.nodeDragEnd ?? []) {
    try {
      const result = entry.contribution.onNodeDragEnd({
        graphMode: options.graphMode,
        node,
        nodes: options.graphData?.nodes ?? [node],
        timelineActive: options.timelineActive ?? false,
      });
      if (result?.keepFixedPosition === true) {
        return true;
      }
    } catch (error) {
      console.error('[CodeGraphy] Plugin node drag end contribution error:', error);
    }
  }

  return false;
}

export function releaseNodeDrag(
  node: FGNode,
  graphMode: GraphMode,
  options: Omit<NodeDragPolicyContext, 'graphMode'> = {},
): void {
  node.isDragging = false;

  const policyKeepsFixedPosition = shouldKeepFixedPosition(
    node,
    { ...options, graphMode },
  );
  const keepFixedPosition = node.isPinned === true || policyKeepsFixedPosition;
  if (keepFixedPosition) {
    return;
  }

  delete node.fx;
  delete node.fy;
  delete node.fz;
}
