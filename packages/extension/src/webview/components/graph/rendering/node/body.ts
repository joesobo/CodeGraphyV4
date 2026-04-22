import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { ThemeKind } from '../../../../theme/useTheme';
import { drawShape } from '../shapes/draw/twoDimensional';
import type { FGNode } from '../../model/build';

const TRANSPARENT_FOLDER_BODY_COLOR = 'rgba(0, 0, 0, 0)';

export interface RenderNodeBodyOptions {
  ctx: CanvasRenderingContext2D;
  decoration: NodeDecorationPayload | undefined;
  globalScale: number;
  isSelected: boolean;
  node: FGNode;
  opacity: number;
  theme: ThemeKind;
}

export function renderNodeBody({
  ctx,
  decoration,
  globalScale,
  isSelected,
  node,
  opacity,
  theme,
}: RenderNodeBodyOptions): void {
  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size);
  ctx.fillStyle = getNodeFillColor(node, decoration);
  ctx.fill();

  ctx.strokeStyle = getNodeBorderColor(node, isSelected, theme);
  ctx.lineWidth = getNodeBorderWidth(node.borderWidth, isSelected, globalScale);
  ctx.globalAlpha = opacity;
  ctx.stroke();
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
  theme: ThemeKind,
): string {
  if (isSelected) {
    return theme === 'light' ? '#000000' : '#ffffff';
  }

  return isTransparentFolderNode(node) ? TRANSPARENT_FOLDER_BODY_COLOR : node.borderColor;
}

function getNodeBorderWidth(
  borderWidth: number,
  isSelected: boolean,
  globalScale: number,
): number {
  return (isSelected ? Math.max(borderWidth, 3) : borderWidth) / globalScale;
}

function isTransparentFolderNode(node: FGNode): boolean {
  return node.nodeType === 'folder' && node.color === TRANSPARENT_FOLDER_BODY_COLOR;
}
