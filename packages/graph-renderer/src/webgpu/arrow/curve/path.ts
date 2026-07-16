import type { GraphRendererNodeStyle } from '../../../contracts';
import { GRAPH_SELF_LOOP_RADIUS } from '../../link/geometry/model';
import { writeCurvedArrowBoundary, type ArrowCurve } from './boundary';

export function writeSelfLoopArrowBoundary(
  output: Float32Array,
  offset: number,
  sourceX: number,
  sourceY: number,
  curvature: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale: number,
): void {
  const radius = Math.max(0.5, Math.abs(curvature)) * GRAPH_SELF_LOOP_RADIUS;
  const curve: ArrowCurve = {
    cubic: true,
    firstControlX: sourceX,
    firstControlY: sourceY - radius,
    secondControlX: sourceX + radius,
    secondControlY: sourceY,
    sourceX,
    sourceY,
    targetX: sourceX,
    targetY: sourceY,
  };
  writeCurvedArrowBoundary(output, offset, curve, 3, sourceStyle, targetStyle, visualScale);
}

export function writeQuadraticArrowBoundary(
  output: Float32Array,
  offset: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  curvature: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale: number,
): void {
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const controlX = (sourceX + targetX) / 2 + deltaY * curvature;
  const controlY = (sourceY + targetY) / 2 - deltaX * curvature;
  const curve: ArrowCurve = {
    cubic: false,
    firstControlX: controlX,
    firstControlY: controlY,
    secondControlX: controlX,
    secondControlY: controlY,
    sourceX,
    sourceY,
    targetX,
    targetY,
  };
  writeCurvedArrowBoundary(output, offset, curve, 2, sourceStyle, targetStyle, visualScale);
}
