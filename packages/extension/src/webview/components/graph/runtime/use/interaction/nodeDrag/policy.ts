import type { FGNode } from '../../../../model/build';
import type { NodeDragPolicyContext } from './types';

export function shouldKeepFixedPosition(
  node: FGNode,
  options: NodeDragPolicyContext,
): boolean {
  for (const entry of options.graphViewContributions?.nodeDragEnd ?? []) {
    try {
      const result = entry.contribution.onNodeDragEnd({
        node,
        nodes: options.graphData?.nodes ?? [node],
        timelineActive: options.timelineActive ?? false,
      });
      if (result?.keepFixedPosition === true) return true;
    } catch (error) {
      console.error('[CodeGraphy] Plugin node drag end contribution error:', error);
    }
  }

  return false;
}

export function releaseNodeDrag(
  node: FGNode,
  options: NodeDragPolicyContext = {},
): void {
  node.isDragging = false;
  shouldKeepFixedPosition(node, options);
}
