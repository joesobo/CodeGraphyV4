import type { FGNode } from '../../model/build';

export const MIN_FIT_VIEW_PADDING = 20;

function getNodeFitPaddingSize(node: FGNode): number {
  if (
    node.isGraphSection
    && !node.isCollapsedGraphSection
    && typeof node.sectionHeight === 'number'
    && Number.isFinite(node.sectionHeight)
    && typeof node.sectionWidth === 'number'
    && Number.isFinite(node.sectionWidth)
  ) {
    return Math.max(node.sectionHeight, node.sectionWidth) / 2;
  }

  return typeof node.size === 'number' && Number.isFinite(node.size) ? node.size : 0;
}

export function getFitViewPadding(nodes: FGNode[]): number {
  let maxNodeSize = 0;

  for (const node of nodes) {
    maxNodeSize = Math.max(maxNodeSize, getNodeFitPaddingSize(node));
  }

  return Math.ceil((maxNodeSize * 3) + MIN_FIT_VIEW_PADDING);
}
