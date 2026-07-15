import { x, y } from '../../../memory';
import { charge, setCharge, setChargeX, setChargeY, strength } from '../charge/storage';
import { leafHead, nextCoincident } from '../tree/cells';
import { EMPTY_INDEX } from '../tree/state';

export function accumulateLeaf(cell: i32): void {
  const head = leafHead(cell);
  setChargeX(cell, x(head));
  setChargeY(cell, y(head));
  let totalCharge: f64 = 0;
  let node = head;
  while (node != EMPTY_INDEX) {
    totalCharge += strength(node);
    node = nextCoincident(node);
  }
  setCharge(cell, totalCharge);
}

export function rootCharge(root: i32): f64 {
  return root == EMPTY_INDEX ? 0 : charge(root);
}
