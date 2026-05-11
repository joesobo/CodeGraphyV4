import type { GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';
import { getImage } from '../imageCache';
import {
  getGraphSectionMaterialIconPath,
  isGraphSectionUploadedIcon,
} from '../../sectionFrames/icons';

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
    || node.x === undefined
    || node.y === undefined
  ) {
    return;
  }

  ctx.save();
  renderExpandChevron({
    appearance,
    ctx,
    globalScale,
    node,
    x: node.x,
    y: node.y,
  });

  if (node.icon) {
    renderSectionIcon({
      appearance,
      ctx,
      globalScale,
      node,
      x: node.x,
      y: node.y,
    });
  }

  if (hiddenDescendantCount > 0) {
    renderHiddenDescendantCount({
      appearance,
      ctx,
      globalScale,
      hiddenDescendantCount,
      node,
      x: node.x,
      y: node.y,
    });
  }

  ctx.restore();
}

function renderSectionIcon({
  appearance,
  ctx,
  node,
  x,
  y,
}: RenderCollapsedSectionBadgeOptions & { x: number; y: number }): void {
  const icon = node.icon;
  if (isGraphSectionUploadedIcon(icon)) {
    const image = getImage(icon);
    if (image) {
      const imageSize = node.size * 0.95;
      ctx.drawImage(image, x - imageSize / 2, y - imageSize / 2, imageSize, imageSize);
    }
    return;
  }

  const materialPath = getGraphSectionMaterialIconPath(icon);
  if (materialPath && typeof Path2D !== 'undefined') {
    const iconSize = node.size * 0.85;
    const iconPath = new Path2D(materialPath);
    ctx.save();
    ctx.translate(x - iconSize / 2, y - iconSize / 2);
    ctx.scale(iconSize / 24, iconSize / 24);
    ctx.fillStyle = appearance.labelForeground;
    ctx.fill(iconPath);
    ctx.restore();
    return;
  }

  ctx.fillStyle = appearance.labelForeground;
  ctx.font = `${Math.max(10, node.size * 0.9)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.icon!, x, y);
}

function renderExpandChevron({
  appearance,
  ctx,
  globalScale,
  node,
  x,
  y,
}: RenderCollapsedSectionBadgeOptions & { x: number; y: number }): void {
  const centerX = x - node.size * 0.45;
  const centerY = y - node.size * 0.45;
  const halfWidth = 4 / globalScale;
  const halfHeight = 2 / globalScale;

  ctx.beginPath();
  ctx.moveTo(centerX - halfWidth, centerY - halfHeight);
  ctx.lineTo(centerX, centerY + halfHeight);
  ctx.lineTo(centerX + halfWidth, centerY - halfHeight);
  ctx.strokeStyle = appearance.labelForeground;
  ctx.lineWidth = Math.max(1, 1.5 / globalScale);
  ctx.stroke();
}

function renderHiddenDescendantCount({
  appearance,
  ctx,
  globalScale,
  hiddenDescendantCount,
  node,
  x,
  y,
}: RenderCollapsedSectionBadgeOptions & {
  hiddenDescendantCount: number;
  x: number;
  y: number;
}): void {
  const centerX = x + node.size * 0.45;
  const centerY = y - node.size * 0.45;

  ctx.fillStyle = appearance.labelForeground;
  ctx.font = `${Math.max(8, 8 / globalScale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatHiddenDescendantCount(hiddenDescendantCount), centerX, centerY);
}
