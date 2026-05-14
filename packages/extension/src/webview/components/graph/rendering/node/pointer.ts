import { drawShape } from '../shapes/draw/twoDimensional';
import type { FGNode } from '../../model/build';

function isExpandedGraphSectionNode(node: FGNode): boolean {
  return !!node.isGraphSection && !node.isCollapsedGraphSection;
}

export function paintNodePointerArea(
  node: FGNode,
  color: string,
  ctx: CanvasRenderingContext2D,
): void {
  if (isExpandedGraphSectionNode(node)) {
    return;
  }

  ctx.fillStyle = color;
  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size + 2);
  ctx.fill();
}
