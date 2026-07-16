export interface CurveCoordinates {
  cubic: boolean;
  firstControl: number;
  secondControl: number;
  source: number;
  target: number;
}

export function curveCoordinate(curve: CurveCoordinates, position: number): number {
  const inverse = 1 - position;
  if (curve.cubic) {
    return inverse ** 3 * curve.source
      + 3 * inverse * inverse * position * curve.firstControl
      + 3 * inverse * position * position * curve.secondControl
      + position ** 3 * curve.target;
  }
  return inverse * inverse * curve.source
    + 2 * inverse * position * curve.firstControl
    + position * position * curve.target;
}
