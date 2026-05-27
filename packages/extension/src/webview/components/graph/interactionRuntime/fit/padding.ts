import type { FGNode } from '../../model/build';

export const MIN_FIT_VIEW_PADDING = 20;

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function getExpandedGraphSectionPaddingSize(node: FGNode): number | undefined {
  const sectionHeight = readFiniteNumber(node.sectionHeight);
  const sectionWidth = readFiniteNumber(node.sectionWidth);
  return node.isGraphSection && !node.isCollapsedGraphSection && sectionHeight !== undefined && sectionWidth !== undefined
    ? Math.max(sectionHeight, sectionWidth) / 2
    : undefined;
}

function getNodeFitPaddingSize(node: FGNode): number {
  return getExpandedGraphSectionPaddingSize(node) ?? readFiniteNumber(node.size) ?? 0;
}

export function getFitViewPadding(nodes: FGNode[]): number {
  let maxNodeSize = 0;

  for (const node of nodes) {
    maxNodeSize = Math.max(maxNodeSize, getNodeFitPaddingSize(node));
  }

  return Math.ceil((maxNodeSize * 3) + MIN_FIT_VIEW_PADDING);
}
