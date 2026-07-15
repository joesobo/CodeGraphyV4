import type { GraphRendererNodeStyle } from '../../contracts';
import { writeQuadraticArrowBoundary, writeSelfLoopArrowBoundary } from './curve/path';
import { writeStraightArrowBoundary } from './straightBoundary';

export const GRAPH_ARROW_LENGTH = 12;
export const GRAPH_ARROW_HALF_WIDTH = GRAPH_ARROW_LENGTH / 1.6 / 2;

export function writeArrowCurveParameters(
  output: Float32Array,
  offset: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  curvature: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale = 1,
): void {
  const deltaX = targetX - sourceX;
  const deltaY = targetY - sourceY;
  const distance = Math.hypot(deltaX, deltaY);
  if (distance > 0 && curvature === 0) {
    writeStraightArrowBoundary(
      output,
      offset,
      deltaX,
      deltaY,
      distance,
      sourceStyle,
      targetStyle,
      visualScale,
    );
    return;
  }
  if (distance === 0) {
    writeSelfLoopArrowBoundary(
      output,
      offset,
      sourceX,
      sourceY,
      curvature,
      sourceStyle,
      targetStyle,
      visualScale,
    );
    return;
  }
  writeQuadraticArrowBoundary(
    output,
    offset,
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature,
    sourceStyle,
    targetStyle,
    visualScale,
  );
}
