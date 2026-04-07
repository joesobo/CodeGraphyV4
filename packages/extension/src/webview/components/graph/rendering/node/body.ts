import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { ThemeKind } from '../../../../theme/useTheme';
import { drawShape } from '../shapes/draw2d';
import type { FGNode } from '../../model/build';

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
  ctx.fillStyle = decoration?.color ?? node.color;
  ctx.fill();

  const borderColor = isSelected
    ? (theme === 'light' ? '#000000' : '#ffffff')
    : node.borderColor;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = (isSelected ? Math.max(node.borderWidth, 3) : node.borderWidth) / globalScale;
  ctx.globalAlpha = opacity;
  ctx.stroke();
}
