import { drawShape } from '../shapes/draw/twoDimensional';
import type { FGNode } from '../../model/build';

function isExpandedGraphSectionNode(node: FGNode): boolean {
  return !!node.isGraphSection && !node.isCollapsedGraphSection;
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function paintNodePointerArea(
  node: FGNode,
  color: string,
  ctx: CanvasRenderingContext2D,
): void {
  if (isExpandedGraphSectionNode(node)) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.rect(
      readFiniteNumber(node.x) ?? 0,
      readFiniteNumber(node.y) ?? 0,
      readFiniteNumber(node.sectionWidth) ?? Math.max(80, (node.size ?? 20) * 4),
      readFiniteNumber(node.sectionHeight) ?? Math.max(80, (node.size ?? 20) * 4),
    );
    ctx.fill();
    return;
  }

  ctx.fillStyle = color;
  drawShape(ctx, node.shape2D ?? 'circle', node.x!, node.y!, node.size + 2);
  ctx.fill();
}
