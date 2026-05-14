import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import { drawShape } from '../shapes/draw/twoDimensional';
import type { FGNode } from '../../model/build';

export interface RenderNodeBodyOptions {
  appearance?: Pick<GraphAppearance, 'nodeSelectionBorder' | 'transparent'>;
  ctx: CanvasRenderingContext2D;
  decoration: NodeDecorationPayload | undefined;
  globalScale: number;
  isSelected: boolean;
  node: FGNode;
  opacity: number;
}

export function renderNodeBody({
  appearance = DEFAULT_GRAPH_APPEARANCE,
  ctx,
  decoration,
  globalScale,
  isSelected,
  node,
  opacity,
}: RenderNodeBodyOptions): void {
  drawNodeBodyPath(ctx, node);
  ctx.fillStyle = getNodeFillColor(node, decoration);
  ctx.fill();

  ctx.strokeStyle = getNodeBorderColor(node, isSelected, appearance);
  ctx.lineWidth = getNodeBorderWidth(node.borderWidth, isSelected, globalScale);
  ctx.globalAlpha = opacity;
  ctx.stroke();
}

function drawNodeBodyPath(ctx: CanvasRenderingContext2D, node: FGNode): void {
  if (node.isCollapsedGraphSection) {
    drawRoundedSectionSquare(ctx, node.x!, node.y!, node.size);
    return;
  }

  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size);
}

function drawRoundedSectionSquare(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
): void {
  const left = x - size;
  const top = y - size;
  const right = x + size;
  const bottom = y + size;
  const radius = Math.min(size * 0.5, 8);

  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.lineTo(right - radius, top);
  ctx.quadraticCurveTo(right, top, right, top + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(left + radius, bottom);
  ctx.quadraticCurveTo(left, bottom, left, bottom - radius);
  ctx.lineTo(left, top + radius);
  ctx.quadraticCurveTo(left, top, left + radius, top);
  ctx.closePath();
}

function getNodeFillColor(
  node: FGNode,
  decoration: NodeDecorationPayload | undefined,
): string {
  return node.nodeType === 'folder'
    ? node.color
    : (decoration?.color ?? node.color);
}

function getNodeBorderColor(
  node: FGNode,
  isSelected: boolean,
  appearance: Pick<GraphAppearance, 'nodeSelectionBorder' | 'transparent'>,
): string {
  if (isSelected) {
    return appearance.nodeSelectionBorder;
  }

  return isTransparentFolderNode(node, appearance.transparent) ? appearance.transparent : node.borderColor;
}

function getNodeBorderWidth(
  borderWidth: number,
  isSelected: boolean,
  globalScale: number,
): number {
  return (isSelected ? Math.max(borderWidth, 3) : borderWidth) / globalScale;
}

function isTransparentFolderNode(node: FGNode, transparentColor: string): boolean {
  return node.nodeType === 'folder' && node.color === transparentColor;
}
