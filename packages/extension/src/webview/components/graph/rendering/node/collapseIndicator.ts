import type { FGNode } from '../../model/build';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';

const MAX_BADGE_COUNT = 99;

export function shouldRenderNodeCollapseIndicator(node: FGNode): boolean {
  return node.nodeType === 'folder' && node.isCollapsible === true;
}

export function formatCollapsedDescendantCount(count: number | undefined): string {
  if (!count || count < 1) {
    return '';
  }

  return count > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(count);
}

export function getNodeCollapseIndicatorCenter(node: FGNode): { x: number; y: number } {
  return {
    x: node.x! - node.size * 0.58,
    y: node.y! - node.size * 0.58,
  };
}

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
    renderCountBadge(ctx, node, badgeLabel, scale, appearance.stageBackground);
  }
}

function renderChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  collapsed: boolean,
  color: string,
): void {
  const size = 7 * scale;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.25 * scale, 0.5);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  if (collapsed) {
    ctx.moveTo(x - size * 0.25, y - size * 0.5);
    ctx.lineTo(x + size * 0.35, y);
    ctx.lineTo(x - size * 0.25, y + size * 0.5);
  } else {
    ctx.moveTo(x - size * 0.5, y - size * 0.25);
    ctx.lineTo(x, y + size * 0.35);
    ctx.lineTo(x + size * 0.5, y - size * 0.25);
  }
  ctx.stroke();
  ctx.restore();
}

function renderCountBadge(
  ctx: CanvasRenderingContext2D,
  node: FGNode,
  label: string,
  scale: number,
  textColor: string,
): void {
  const x = node.x! + node.size * 0.55;
  const y = node.y! + node.size * 0.55;
  const radius = Math.max(6 * scale, 4);

  ctx.save();
  ctx.fillStyle = node.borderColor || node.color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.font = `${Math.max(8 * scale, 5)}px Sans-Serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  ctx.restore();
}
