import { setX, setY, x, y } from '../../memory';

export function applyCollisionCorrection(
  first: i32,
  second: i32,
  directionX: f64,
  directionY: f64,
  correction: f64,
  firstShare: f64,
  secondShare: f64,
): void {
  setX(first, x(first) - directionX * correction * firstShare);
  setY(first, y(first) - directionY * correction * firstShare);
  setX(second, x(second) + directionX * correction * secondShare);
  setY(second, y(second) + directionY * correction * secondShare);
}
