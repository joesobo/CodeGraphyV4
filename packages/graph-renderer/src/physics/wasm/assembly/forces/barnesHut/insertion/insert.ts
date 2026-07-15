import { isFiniteNumber, isHidden, nodeCount, x, y } from '../../../memory';
import { splitLeaf } from '../leaf/split';
import { leafHead, setInternal, setLeafHead, setNextCoincident } from '../tree/cells';
import { EMPTY_INDEX, overflowed } from '../tree/state';
import { findInsertionCell } from './search';

function insert(nodeIndex: i32, nodeX: f64, nodeY: f64): void {
  const cell = findInsertionCell(nodeIndex, nodeX, nodeY);
  if (cell == EMPTY_INDEX) return;
  const existingHead = leafHead(cell);
  if (existingHead == EMPTY_INDEX) {
    setLeafHead(cell, nodeIndex);
    return;
  }
  const existingX = x(existingHead);
  const existingY = y(existingHead);
  if (nodeX == existingX && nodeY == existingY) {
    setNextCoincident(nodeIndex, existingHead);
    setLeafHead(cell, nodeIndex);
    return;
  }
  setLeafHead(cell, EMPTY_INDEX);
  setInternal(cell, true);
  splitLeaf(cell, nodeIndex, nodeX, nodeY, existingHead, existingX, existingY);
}

export function insertVisibleNodes(): void {
  for (let index = 0; index < nodeCount; index += 1) {
    if (isHidden(index)) continue;
    const currentX = x(index);
    const currentY = y(index);
    if (!isFiniteNumber(currentX) || !isFiniteNumber(currentY)) continue;
    insert(index, currentX, currentY);
    if (overflowed()) return;
  }
}
