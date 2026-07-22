import type { CurveCoordinates } from './coordinate';

export function curveTangentCoordinate(curve: CurveCoordinates, position: number): number {
  const inverse = 1 - position;
  if (curve.cubic) {
    return 3 * inverse * inverse * (curve.firstControl - curve.source)
      + 6 * inverse * position * (curve.secondControl - curve.firstControl)
      + 3 * position * position * (curve.target - curve.secondControl);
  }
  return 2 * inverse * (curve.firstControl - curve.source)
    + 2 * position * (curve.target - curve.firstControl);
}
