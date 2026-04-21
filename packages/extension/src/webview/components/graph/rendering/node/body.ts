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
  const shape = node.shape2D ?? 'circle';
  drawShape(ctx, shape, node.x!, node.y!, node.size);
  const isFolderNode = node.nodeType === 'folder';
  const isTransparentFolderNode = isFolderNode && Boolean(node.imageUrl);
  ctx.fillStyle = isFolderNode
    ? (isTransparentFolderNode ? TRANSPARENT_FOLDER_BODY_COLOR : node.color)
    : (decoration?.color ?? node.color);
  ctx.fill();

  const borderColor = isSelected
    ? (theme === 'light' ? '#000000' : '#ffffff')
    : (isTransparentFolderNode ? TRANSPARENT_FOLDER_BODY_COLOR : node.borderColor);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = (isSelected ? Math.max(node.borderWidth, 3) : node.borderWidth) / globalScale;
  ctx.globalAlpha = opacity;
  ctx.stroke();
}
