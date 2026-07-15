import { collisionPadding, collisionScale, collisionStrength } from '../../parameters';
import { deterministicDirectionAngle } from '../../initialization';
import { isPinned, radius, x, y } from '../../memory';
import { applyCollisionCorrection } from './correction';
import { firstCollisionShare, secondCollisionShare } from './share';
import { applyCollisionVelocity } from './velocity';

export function applyCollisionPair(first: i32, second: i32): bool {
  let dx = x(second) - x(first);
  let dy = y(second) - y(first);
  let distanceSquared = dx * dx + dy * dy;
  if (distanceSquared < 0.0001) {
    const angle = deterministicDirectionAngle(first, second);
    dx = Math.cos(angle) * 0.01;
    dy = Math.sin(angle) * 0.01;
    distanceSquared = dx * dx + dy * dy;
  }
  const distance = Math.sqrt(distanceSquared);
  const firstRadius = radius(first) * collisionScale;
  const secondRadius = radius(second) * collisionScale;
  const minimumDistance = firstRadius + secondRadius + collisionPadding;
  if (distance + 0.25 >= minimumDistance) return false;
  const firstPinned = isPinned(first);
  const secondPinned = isPinned(second);
  if (firstPinned && secondPinned) return false;
  const firstShare = firstCollisionShare(
    firstRadius,
    secondRadius,
    firstPinned,
    secondPinned,
  );
  const secondShare = secondCollisionShare(
    firstRadius,
    secondRadius,
    firstPinned,
    secondPinned,
  );
  const correction = (minimumDistance - distance) * collisionStrength;
  const directionX = dx / distance;
  const directionY = dy / distance;
  applyCollisionCorrection(
    first,
    second,
    directionX,
    directionY,
    correction,
    firstShare,
    secondShare,
  );
  applyCollisionVelocity(
    first,
    second,
    directionX,
    directionY,
    firstShare,
    secondShare,
    firstPinned,
    secondPinned,
  );
  return true;
}
