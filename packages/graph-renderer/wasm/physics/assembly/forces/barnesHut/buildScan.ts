import { isFiniteNumber, isHidden, multiplier, nodeCount, x, y } from '../../memory';
import { setNextCoincident } from './cells';
import {
  maximumX,
  maximumY,
  minimumX,
  minimumY,
  setMaximumX,
  setMaximumY,
  setMinimumX,
  setMinimumY,
  setRootSize,
  rootSize,
} from './extent';
import { setStrength } from './charge';
import {
  EMPTY_INDEX,
  setCellCount,
  setOverflowed,
  setRoot,
  setVisibleNodeCount,
  visibleNodeCount,
} from './treeState';

export function resetBuild(): void {
  setRoot(EMPTY_INDEX);
  setCellCount(0);
  setVisibleNodeCount(0);
  setMinimumX(Infinity);
  setMinimumY(Infinity);
  setMaximumX(-Infinity);
  setMaximumY(-Infinity);
  setOverflowed(false);
}

export function scanVisibleNodes(globalChargeStrength: f64): bool {
  for (let index = 0; index < nodeCount; index += 1) {
    if (isHidden(index)) continue;
    setNextCoincident(index, EMPTY_INDEX);
    const currentX = x(index);
    const currentY = y(index);
    if (!isFiniteNumber(currentX) || !isFiniteNumber(currentY)) continue;
    setMinimumX(Math.min(minimumX(), currentX));
    setMinimumY(Math.min(minimumY(), currentY));
    setMaximumX(Math.max(maximumX(), currentX));
    setMaximumY(Math.max(maximumY(), currentY));
    setStrength(index, globalChargeStrength * multiplier(index));
    setVisibleNodeCount(visibleNodeCount() + 1);
  }
  return visibleNodeCount() > 0;
}

export function initializeExtent(): void {
  setMinimumX(Math.floor(minimumX()));
  setMinimumY(Math.floor(minimumY()));
  setRootSize(1);
  while (
    maximumX() >= minimumX() + rootSize()
    || maximumY() >= minimumY() + rootSize()
  ) setRootSize(rootSize() * 2);
}
