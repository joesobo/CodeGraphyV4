import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';

export interface RenderNodeLabelOptions {
  appearance?: Pick<GraphAppearance, 'labelForeground' | 'labelMutedForeground'>;
  ctx: CanvasRenderingContext2D;
  decoration: NodeDecorationPayload | undefined;
  globalScale: number;
  isHighlighted: boolean;
  node: FGNode;
  opacity: number;
}

export function renderNodeLabel({
  appearance = DEFAULT_GRAPH_APPEARANCE,
  ctx,
  decoration,
  globalScale,
  isHighlighted,
  node,
  opacity,
}: RenderNodeLabelOptions): void {
  const labelPx = 12 / globalScale;
  const labelOpacity = Math.min(1, Math.max(0, (globalScale - 0.35) / 1.2));
  if (labelOpacity <= 0.01) return;
  const nodeHalfHeight = node.shapeSize2D?.height
    ? node.shapeSize2D.height / 2
    : node.size;

  ctx.font = `${labelPx}px Sans-Serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const baseColor = isHighlighted
    ? appearance.labelForeground
    : appearance.labelMutedForeground;
  ctx.globalAlpha = opacity * labelOpacity;
  ctx.fillStyle = decoration?.label?.color ?? baseColor;
  ctx.fillText(
    decoration?.label?.text ?? node.label,
    node.x!,
    node.y! + nodeHalfHeight + 2 / globalScale,
  );
}
