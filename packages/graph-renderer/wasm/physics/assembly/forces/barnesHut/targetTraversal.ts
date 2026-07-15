import { applyCellForce } from './applyCell';
import { pushChildren } from './childTraversal';
import { minimumX, minimumY, rootSize } from './extent';
import {
  setTraversalCell,
  setTraversalSize,
  setTraversalX,
  setTraversalY,
  traversalCell,
} from './traversal';
import { root } from './treeState';

export function applyForceToTarget(
  target: i32,
  alpha: f64,
  thetaSquared: f64,
  distanceMinimumSquared: f64,
  distanceMaximumSquared: f64,
): void {
  let stackLength = 1;
  setTraversalCell(0, root());
  setTraversalX(0, minimumX());
  setTraversalY(0, minimumY());
  setTraversalSize(0, rootSize());
  while (stackLength > 0) {
    stackLength -= 1;
    const cell = traversalCell(stackLength);
    const open = applyCellForce(
      target,
      cell,
      stackLength,
      alpha,
      thetaSquared,
      distanceMinimumSquared,
      distanceMaximumSquared,
    );
    if (open) stackLength = pushChildren(cell, stackLength);
  }
}
