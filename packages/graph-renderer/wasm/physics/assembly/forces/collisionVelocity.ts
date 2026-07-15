import { setVx, setVy, vx, vy } from '../memory';

export function applyCollisionVelocity(
  first: i32,
  second: i32,
  directionX: f64,
  directionY: f64,
  firstShare: f64,
  secondShare: f64,
  firstPinned: bool,
  secondPinned: bool,
): void {
  const relativeX = vx(second) - vx(first);
  const relativeY = vy(second) - vy(first);
  const closingVelocity = relativeX * directionX + relativeY * directionY;
  if (closingVelocity >= 0) return;
  if (!firstPinned) {
    setVx(first, vx(first) + directionX * closingVelocity * firstShare);
    setVy(first, vy(first) + directionY * closingVelocity * firstShare);
  }
  if (!secondPinned) {
    setVx(second, vx(second) - directionX * closingVelocity * secondShare);
    setVy(second, vy(second) - directionY * closingVelocity * secondShare);
  }
}
