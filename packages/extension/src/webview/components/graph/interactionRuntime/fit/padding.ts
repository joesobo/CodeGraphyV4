import type { FGNode } from '../../model/build';

export const MIN_FIT_VIEW_PADDING = 20;

export function getFitViewPadding(nodes: FGNode[]): number {
  let maxNodeSize = 0;

  for (const node of nodes) {
    if (typeof node.size === 'number' && Number.isFinite(node.size)) {
      maxNodeSize = Math.max(maxNodeSize, node.size);
    }
  }

  return Math.ceil((maxNodeSize * 3) + MIN_FIT_VIEW_PADDING);
}
