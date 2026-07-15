import type { GraphRendererNodeStyle } from '../../contracts';
import { correctedCurveBoundaryOffset, type CurveBoundary } from '../curve/boundary';
import type { CurveCoordinates } from '../curve/coordinate';

export interface ArrowCurve {
  cubic: boolean;
  firstControlX: number;
  firstControlY: number;
  secondControlX: number;
  secondControlY: number;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

function coordinate(
  source: number,
  target: number,
  firstControl: number,
  secondControl: number,
  cubic: boolean,
): CurveCoordinates {
  return { cubic, firstControl, secondControl, source, target };
}

function boundary(
  curve: ArrowCurve,
  source: boolean,
  tangentMultiplier: number,
  style: GraphRendererNodeStyle,
  visualScale: number,
): CurveBoundary {
  return {
    centerX: source ? curve.sourceX : curve.targetX,
    centerY: source ? curve.sourceY : curve.targetY,
    curveX: coordinate(
      curve.sourceX,
      curve.targetX,
      curve.firstControlX,
      curve.secondControlX,
      curve.cubic,
    ),
    curveY: coordinate(
      curve.sourceY,
      curve.targetY,
      curve.firstControlY,
      curve.secondControlY,
      curve.cubic,
    ),
    direction: source ? 1 : -1,
    positionOrigin: source ? 0 : 1,
    style,
    tangentX: tangentMultiplier * (
      source ? curve.firstControlX - curve.sourceX : curve.targetX - curve.secondControlX
    ),
    tangentY: tangentMultiplier * (
      source ? curve.firstControlY - curve.sourceY : curve.targetY - curve.secondControlY
    ),
    visualScale,
  };
}

export function writeCurvedArrowBoundary(
  output: Float32Array,
  offset: number,
  curve: ArrowCurve,
  tangentMultiplier: number,
  sourceStyle: GraphRendererNodeStyle,
  targetStyle: GraphRendererNodeStyle,
  visualScale: number,
): void {
  output[offset] = correctedCurveBoundaryOffset(
    boundary(curve, true, tangentMultiplier, sourceStyle, visualScale),
  );
  output[offset + 1] = 1 - correctedCurveBoundaryOffset(
    boundary(curve, false, tangentMultiplier, targetStyle, visualScale),
  );
}
