import { setVx, setVy, vx, vy } from '../../../memory';
import { softenDisplacement } from '../charge/displacement';
import { strength } from '../charge/storage';
import { forceDistanceSquared, forceDx, forceDy } from '../forceState';
import { leafHead, nextCoincident } from '../tree/cells';
import { EMPTY_INDEX } from '../tree/state';

export function applyLeafForce(
  target: i32,
  cell: i32,
  alpha: f64,
  distanceMinimumSquared: f64,
): void {
  const head = leafHead(cell);
  if (head != target || nextCoincident(head) != EMPTY_INDEX) {
    softenDisplacement(distanceMinimumSquared);
  }
  let source = head;
  while (source != EMPTY_INDEX) {
    if (source != target) {
      const impulse = strength(source) * alpha / forceDistanceSquared();
      setVx(target, vx(target) + forceDx() * impulse);
      setVy(target, vy(target) + forceDy() * impulse);
    }
    source = nextCoincident(source);
  }
}
