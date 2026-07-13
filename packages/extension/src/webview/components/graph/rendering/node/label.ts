import type { NodeDecorationPayload } from '../../../../../shared/plugins/decorations';
import { DEFAULT_GRAPH_APPEARANCE, type GraphAppearance } from '../../appearance/model';
import type { FGNode } from '../../model/build';
import type { NodeLabelSpriteProvider } from './labelSprite';

export interface RenderNodeLabelOptions {
  appearance?: Pick<GraphAppearance, 'labelForeground' | 'labelMutedForeground'>;
  ctx: CanvasRenderingContext2D;
  decoration: NodeDecorationPayload | undefined;
  globalScale: number;
  isHighlighted: boolean;
  node: FGNode;
  opacity: number;
  spriteCache: NodeLabelSpriteProvider;
}

export function renderNodeLabel({
  appearance = DEFAULT_GRAPH_APPEARANCE,
  ctx,
  decoration,
  globalScale,
  isHighlighted,
  node,
  opacity,
  spriteCache,
}: RenderNodeLabelOptions): void {
  const labelOpacity = Math.min(1, Math.max(0, (globalScale - 0.35) / 1.2));
  if (labelOpacity <= 0.01) return;
  const nodeHalfHeight = node.shapeSize2D?.height
    ? node.shapeSize2D.height / 2
    : node.size;

  const baseColor = isHighlighted
    ? appearance.labelForeground
    : appearance.labelMutedForeground;
  const color = decoration?.label?.color ?? baseColor;
  const sprite = spriteCache.get(
    decoration?.label?.text ?? node.label,
    color,
    window.devicePixelRatio || 1,
  );
  const width = sprite.cssWidth / globalScale;
  const height = sprite.cssHeight / globalScale;
  ctx.globalAlpha = opacity * labelOpacity;
  ctx.drawImage(
    sprite.image,
    node.x! - width / 2,
    node.y! + nodeHalfHeight + 2 / globalScale,
    width,
    height,
  );
}
