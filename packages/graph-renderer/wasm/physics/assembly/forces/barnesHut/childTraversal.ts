import { child } from './cells';
import {
  setTraversalCell,
  setTraversalSize,
  setTraversalX,
  setTraversalY,
  traversalSize,
  traversalX,
  traversalY,
} from './traversal';
import { EMPTY_INDEX } from './treeState';

export function pushChildren(cell: i32, stackLength: i32): i32 {
  const half = traversalSize(stackLength) / 2;
  const cellX = traversalX(stackLength);
  const cellY = traversalY(stackLength);
  let nextLength = stackLength;
  for (let quadrant = 3; quadrant >= 0; quadrant -= 1) {
    const nextCell = child(cell, quadrant);
    if (nextCell == EMPTY_INDEX) continue;
    setTraversalCell(nextLength, nextCell);
    setTraversalX(nextLength, cellX + <f64>(quadrant & 1) * half);
    setTraversalY(nextLength, cellY + <f64>((quadrant & 2) >> 1) * half);
    setTraversalSize(nextLength, half);
    nextLength += 1;
  }
  return nextLength;
}
