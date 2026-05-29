import type { FGNode } from '../../model/build';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import { renderCountBadge } from './collapseIndicator/badge';
import { renderChevron } from './collapseIndicator/chevron';
import { formatCollapsedDescendantCount } from './collapseIndicator/count';
import { getNodeCollapseIndicatorCenter } from './collapseIndicator/geometry';
import { shouldRenderNodeCollapseIndicator } from './collapseIndicator/visibility';

export { formatCollapsedDescendantCount } from './collapseIndicator/count';
export { getNodeCollapseIndicatorCenter } from './collapseIndicator/geometry';
export { shouldRenderNodeCollapseIndicator } from './collapseIndicator/visibility';

export function renderNodeCollapseIndicator(
  ctx: CanvasRenderingContext2D,
  node: FGNode,
  globalScale: number,
  appearance: Pick<GraphAppearance, 'labelForeground' | 'stageBackground'> = DEFAULT_GRAPH_APPEARANCE,
): void {
  if (!shouldRenderNodeCollapseIndicator(node)) {
    return;
  }

  const scale = 1 / globalScale;
  const iconCenter = getNodeCollapseIndicatorCenter(node);
  renderChevron(ctx, iconCenter.x, iconCenter.y, scale, Boolean(node.isCollapsed), appearance.labelForeground);

  const badgeLabel = node.isCollapsed
    ? formatCollapsedDescendantCount(node.collapsedDescendantCount)
    : '';
  if (badgeLabel) {
    renderCountBadge(ctx, node, badgeLabel, scale, appearance.labelForeground);
  }
}
