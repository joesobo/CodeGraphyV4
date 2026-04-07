import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import type { ThemeKind } from '../../../../theme/useTheme';
import type { FGNode } from '../../model/build';

export interface RenderNodeLabelOptions {
  ctx: CanvasRenderingContext2D;
  decoration: NodeDecorationPayload | undefined;
  globalScale: number;
  isHighlighted: boolean;
  node: FGNode;
  opacity: number;
  theme: ThemeKind;
}

export function renderNodeLabel({
  ctx,
  decoration,
  globalScale,
  isHighlighted,
  node,
  opacity,
  theme,
}: RenderNodeLabelOptions): void {
  const labelPx = 12 / globalScale;
  const labelOpacity = Math.min(1, Math.max(0, (globalScale - 0.8) / 1.2));
  if (labelOpacity <= 0.01) {
    return;
  }

  ctx.font = `${labelPx}px Sans-Serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const baseColor = isHighlighted
    ? (theme === 'light' ? '#1e1e1e' : '#e2e8f0')
    : (theme === 'light' ? '#9ca3af' : '#4a5568');
  ctx.globalAlpha = opacity * labelOpacity;
  ctx.fillStyle = decoration?.label?.color ?? baseColor;
  ctx.fillText(decoration?.label?.text ?? node.label, node.x!, node.y! + node.size + 2 / globalScale);
}
