import type { GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';

export interface RenderNodePinBadgeOptions {
  appearance: Pick<GraphAppearance, 'nodeSelectionBorder'>;
  ctx: CanvasRenderingContext2D;
  globalScale: number;
  node: FGNode;
}

export function renderNodePinBadge({
  appearance,
  ctx,
  globalScale,
  node,
}: RenderNodePinBadgeOptions): void {
  if (!node.isPinned || node.x === undefined || node.y === undefined) {
    return;
  }

  const radius = 5 / globalScale;
  const centerX = node.x + node.size * 0.7;
  const centerY = node.y + (node.isCollapsedGraphSection ? node.size * 0.7 : -node.size * 0.7);

  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fillStyle = appearance.nodeSelectionBorder;
  ctx.fill();
  ctx.strokeStyle = node.borderColor;
  ctx.lineWidth = Math.max(1, 1.25 / globalScale);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(centerX, centerY - radius * 0.45);
  ctx.lineTo(centerX, centerY + radius * 0.3);
  ctx.strokeStyle = node.color;
  ctx.lineWidth = Math.max(1, 1.5 / globalScale);
  ctx.stroke();
  ctx.restore();
}
