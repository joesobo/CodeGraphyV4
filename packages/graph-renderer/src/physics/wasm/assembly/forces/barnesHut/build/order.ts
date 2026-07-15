import { child, internal } from '../tree/cells';
import { EMPTY_INDEX, root } from '../tree/state';
import { buildTraversal, setBuildStack, setBuildTraversal } from './buffers';

export function collectBuildOrder(): i32 {
  let stackLength = 1;
  let orderLength = 0;
  setBuildTraversal(0, root());
  while (stackLength > 0) {
    stackLength -= 1;
    const cell = buildTraversal(stackLength);
    setBuildStack(orderLength, cell);
    orderLength += 1;
    if (!internal(cell)) continue;
    for (let quadrant = 0; quadrant < 4; quadrant += 1) {
      const nextCell = child(cell, quadrant);
      if (nextCell == EMPTY_INDEX) continue;
      setBuildTraversal(stackLength, nextCell);
      stackLength += 1;
    }
  }
  return orderLength;
}
