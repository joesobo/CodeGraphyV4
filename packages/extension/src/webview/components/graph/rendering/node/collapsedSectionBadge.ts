import type { GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';

export interface RenderCollapsedSectionBadgeOptions {
  appearance: Pick<GraphAppearance, 'labelForeground' | 'nodeSelectionBorder'>;
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  node: FGNode;
}

function formatHiddenDescendantCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

export function renderCollapsedSectionBadge({
  appearance,
  ctx,
  globalScale,
  node,
}: RenderCollapsedSectionBadgeOptions): void {
  const hiddenDescendantCount = node.hiddenDescendantCount ?? 0;
  if (
    !node.isCollapsedGraphSection
    || hiddenDescendantCount <= 0
    || node.x === undefined
    || node.y === undefined
  ) {
    return;
  }

  const radius = 6 / globalScale;
  const centerX = node.x - node.size * 0.7;
  const centerY = node.y - node.size * 0.7;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = appearance.nodeSelectionBorder;
  ctx.fill();
  ctx.strokeStyle = node.borderColor;
  ctx.lineWidth = Math.max(1, 1.25 / globalScale);
  ctx.stroke();

  ctx.fillStyle = appearance.labelForeground;
  ctx.font = `${Math.max(8, 8 / globalScale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatHiddenDescendantCount(hiddenDescendantCount), centerX, centerY + 0.25 / globalScale);
  ctx.restore();
}
