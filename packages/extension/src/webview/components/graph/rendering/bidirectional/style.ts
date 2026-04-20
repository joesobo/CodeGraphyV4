import type { FGLink, FGNode } from '../../model/build';
import type { LinkRenderingDependencies } from '../link/contracts';
import { createBidirectionalArrowGeometry } from './arrow/geometry';

interface LinkDecorationStyle {
  color?: string;
  opacity?: number;
  width?: number;
}

export function renderArrow(
  ctx: CanvasRenderingContext2D,
  color: string,
  arrow: ReturnType<typeof createBidirectionalArrowGeometry>,
): void {
  ctx.beginPath();
  ctx.moveTo(arrow.tipX, arrow.tipY);
  ctx.lineTo(arrow.leftX, arrow.leftY);
  ctx.lineTo(arrow.vertexX, arrow.vertexY);
  ctx.lineTo(arrow.rightX, arrow.rightY);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function getLinkConnectionAlpha(
  decoration: LinkDecorationStyle | undefined,
  highlighted: string | null | undefined,
  source: FGNode,
  target: FGNode,
): number {
  const isConnected = !highlighted || source.id === highlighted || target.id === highlighted;
  return decoration?.opacity ?? (isConnected ? 1 : 0.15);
}

function getLinkStrokeColor(
  decoration: LinkDecorationStyle | undefined,
  highlighted: string | null | undefined,
  source: FGNode,
  target: FGNode,
  isLight: boolean,
  baseColor?: string,
): string {
  if (decoration?.color) {
    return decoration.color;
  }

  if (!highlighted && baseColor) {
    return baseColor;
  }

  const isConnected = !highlighted || source.id === highlighted || target.id === highlighted;
  return isConnected ? '#60a5fa' : (isLight ? '#d4d4d4' : '#2d3748');
}

export function getLineStrokeStyle(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
  source: FGNode,
  target: FGNode,
): { alpha: number; lineWidth: number; strokeStyle: string } {
  const highlighted = dependencies.highlightedNodeRef.current;
  const isLight = dependencies.themeRef.current === 'light';
  const decoration = dependencies.edgeDecorationsRef.current?.[link.id];

  return {
    alpha: getLinkConnectionAlpha(decoration, highlighted, source, target),
    lineWidth: decoration?.width ?? 2,
    strokeStyle: getLinkStrokeColor(decoration, highlighted, source, target, isLight, link.baseColor),
  };
}
