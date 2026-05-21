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
  ctx.globalAlpha = opacity * getNodeFillOpacity(node);
  ctx.fill();

  ctx.strokeStyle = getNodeBorderColor(node, isSelected, appearance);
  ctx.lineWidth = getNodeBorderWidth(node.borderWidth, isSelected, globalScale);
  ctx.globalAlpha = opacity;
  ctx.stroke();
}

function drawNodeBodyPath(ctx: CanvasRenderingContext2D, node: FGNode): void {
  if (node.shapeSize2D) {
    drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size, node.shapeSize2D);
    return;
  }

  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size);
}

function getNodeFillColor(
  node: FGNode,
  decoration: NodeDecorationPayload | undefined,
): string {
  return node.nodeType === 'folder'
    ? node.color
    : (decoration?.color ?? node.color);
}

function getNodeFillOpacity(node: FGNode): number {
  return typeof node.fillOpacity2D === 'number' && Number.isFinite(node.fillOpacity2D)
    ? Math.min(1, Math.max(0, node.fillOpacity2D))
    : 1;
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
