import { setCharge, setChargeX, setChargeY } from '../charge/storage';
import { clearChildren, setInternal, setLeafHead } from '../tree/cells';
import {
  cellCapacity,
  cellCount,
  EMPTY_INDEX,
  overflowed,
  setCellCount,
  setOverflowed,
} from '../tree/state';

export function allocateCell(): i32 {
  if (cellCount() >= cellCapacity()) {
    setOverflowed(true);
    return EMPTY_INDEX;
  }
  const cell = cellCount();
  setCellCount(cell + 1);
  setInternal(cell, false);
  setLeafHead(cell, EMPTY_INDEX);
  setCharge(cell, 0);
  setChargeX(cell, NaN);
  setChargeY(cell, NaN);
  clearChildren(cell);
  return cell;
}

export function createLeaf(nodeIndex: i32): i32 {
  const leaf = allocateCell();
  if (!overflowed()) setLeafHead(leaf, nodeIndex);
  return leaf;
}
