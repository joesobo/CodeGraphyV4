import {
  type FGLink,
  type FGNode,
} from '../../model/build';
import { getGraphDirectionalColor } from '../link/colors';
import { createBidirectionalArrowGeometry } from './arrowGeometry';
import { createBidirectionalLineGeometry } from './lineGeometry';
import type { LinkRenderingDependencies } from '../link/contracts';
import {
  getLineStrokeStyle,
  renderArrow,
} from './style';

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
