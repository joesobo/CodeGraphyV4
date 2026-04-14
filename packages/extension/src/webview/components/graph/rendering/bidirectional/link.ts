import {
  type FGLink,
  type FGNode,
} from '../../model/build';
import { getGraphDirectionalColor } from '../link/colors';
import { createBidirectionalArrowGeometry } from './arrowGeometry';
import { createBidirectionalLineGeometry } from './lineGeometry';
import type { LinkRenderingDependencies } from '../link/contracts';

interface LinkDecorationStyle {
  color?: string;
  opacity?: number;
  width?: number;
}

function renderArrow(
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
): string {
  if (decoration?.color) {
    return decoration.color;
  }

  const isConnected = !highlighted || source.id === highlighted || target.id === highlighted;
  return isConnected ? '#60a5fa' : (isLight ? '#d4d4d4' : '#2d3748');
}

function getLineStrokeStyle(
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
    lineWidth: (decoration?.width ?? 2),
    strokeStyle: getLinkStrokeColor(decoration, highlighted, source, target, isLight),
  };
}

export function renderBidirectionalLink(
  dependencies: LinkRenderingDependencies,
  link: FGLink,
  ctx: CanvasRenderingContext2D,
  globalScale: number,
): void {
  if (!link.bidirectional || dependencies.directionModeRef.current !== 'arrows') return;

  const source = link.source as FGNode;
  const target = link.target as FGNode;
  const geometry = createBidirectionalLineGeometry(source, target, globalScale);
  if (!geometry) return;

  const style = getLineStrokeStyle(dependencies, link, source, target);
  const directionalColor = getGraphDirectionalColor(dependencies);

  ctx.save();
  ctx.globalAlpha = style.alpha;
  ctx.lineWidth = style.lineWidth / globalScale;
  ctx.strokeStyle = style.strokeStyle;
  ctx.beginPath();
  ctx.moveTo(geometry.startX, geometry.startY);
  ctx.lineTo(geometry.endX, geometry.endY);
  ctx.stroke();

  renderArrow(
    ctx,
    directionalColor,
    createBidirectionalArrowGeometry(
      geometry.endX,
      geometry.endY,
      geometry.vectorX,
      geometry.vectorY,
      geometry.normalX,
      geometry.normalY,
      geometry.arrowLength,
      geometry.arrowHalfWidth,
      geometry.arrowVertexLength,
    ),
  );

  renderArrow(
    ctx,
    directionalColor,
    createBidirectionalArrowGeometry(
      geometry.startX,
      geometry.startY,
      -geometry.vectorX,
      -geometry.vectorY,
      geometry.normalX,
      geometry.normalY,
      geometry.arrowLength,
      geometry.arrowHalfWidth,
      geometry.arrowVertexLength,
    ),
  );

  ctx.restore();
}
