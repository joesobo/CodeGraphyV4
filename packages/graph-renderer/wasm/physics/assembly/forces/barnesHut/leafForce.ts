import { setVx, setVy, vx, vy } from '../../memory';
import { strength } from './charge';
import { leafHead, nextCoincident } from './cells';
import { softenDisplacement } from './displacement';
import { forceDistanceSquared, forceDx, forceDy } from './forceState';
import { EMPTY_INDEX } from './treeState';

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
