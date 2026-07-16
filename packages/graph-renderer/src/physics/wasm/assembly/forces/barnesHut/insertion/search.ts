import { child, internal, setChild } from '../tree/cells';
import { quadrantAt } from '../tree/quadrant';
import { EMPTY_INDEX, overflowed, root } from '../tree/state';
import { createLeaf } from './allocation';
import {
  insertionMinimumX,
  insertionMinimumY,
  insertionSize,
  minimumX,
  minimumY,
  rootSize,
  setInsertionMinimumX,
  setInsertionMinimumY,
  setInsertionSize,
} from '../tree/extent';

export function findInsertionCell(nodeIndex: i32, nodeX: f64, nodeY: f64): i32 {
  let cell = root();
  setInsertionMinimumX(minimumX());
  setInsertionMinimumY(minimumY());
  setInsertionSize(rootSize());
  while (internal(cell)) {
    const half = insertionSize() / 2;
    const quadrant = quadrantAt(
      nodeX,
      nodeY,
      insertionMinimumX() + half,
      insertionMinimumY() + half,
    );
    setInsertionMinimumX(insertionMinimumX() + <f64>(quadrant & 1) * half);
    setInsertionMinimumY(insertionMinimumY() + <f64>(quadrant >> 1) * half);
    setInsertionSize(half);
    const nextCell = child(cell, quadrant);
    if (nextCell == EMPTY_INDEX) {
      const leaf = createLeaf(nodeIndex);
      if (!overflowed()) setChild(cell, quadrant, leaf);
      return EMPTY_INDEX;
    }
    cell = nextCell;
  }
  return cell;
}
