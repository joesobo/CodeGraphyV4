import { allocateCell, createLeaf } from './cellAllocation';
import { setChild, setInternal } from './cells';
import {
  insertionMinimumX,
  insertionMinimumY,
  insertionSize,
  setInsertionMinimumX,
  setInsertionMinimumY,
  setInsertionSize,
} from './extent';
import { quadrantAt } from './quadrant';
import { overflowed } from './treeState';

export function splitLeaf(
  initialCell: i32,
  nodeIndex: i32,
  nodeX: f64,
  nodeY: f64,
  existingHead: i32,
  existingX: f64,
  existingY: f64,
): void {
  let cell = initialCell;
  while (!overflowed()) {
    const half = insertionSize() / 2;
    const midpointX = insertionMinimumX() + half;
    const midpointY = insertionMinimumY() + half;
    const quadrant = quadrantAt(nodeX, nodeY, midpointX, midpointY);
    const existingQuadrant = quadrantAt(existingX, existingY, midpointX, midpointY);
    if (quadrant != existingQuadrant) {
      const existingLeaf = createLeaf(existingHead);
      const newLeaf = createLeaf(nodeIndex);
      if (overflowed()) return;
      setChild(cell, existingQuadrant, existingLeaf);
      setChild(cell, quadrant, newLeaf);
      return;
    }
    const nextCell = allocateCell();
    if (overflowed()) return;
    setInternal(nextCell, true);
    setChild(cell, quadrant, nextCell);
    cell = nextCell;
    setInsertionMinimumX(insertionMinimumX() + <f64>(quadrant & 1) * half);
    setInsertionMinimumY(insertionMinimumY() + <f64>(quadrant >> 1) * half);
    setInsertionSize(half);
  }
}
