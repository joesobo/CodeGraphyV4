import type { FGNode } from '../../model/build';

export const MIN_FIT_VIEW_PADDING = 20;

function getNodeFitPaddingSize(node: FGNode): number {
  return typeof node.size === 'number' && Number.isFinite(node.size) ? node.size : 0;
}

export function getFitViewPadding(nodes: FGNode[]): number {
  let maxNodeSize = 0;

  for (const node of nodes) {
    maxNodeSize = Math.max(maxNodeSize, getNodeFitPaddingSize(node));
  }

  return Math.ceil((maxNodeSize * 3) + MIN_FIT_VIEW_PADDING);
}
