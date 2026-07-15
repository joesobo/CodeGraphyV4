import { charge, chargeX, chargeY, setCharge, setChargeX, setChargeY } from './charge';
import { child } from './cells';
import { EMPTY_INDEX } from './treeState';

export function accumulateInternal(cell: i32): void {
  let totalCharge: f64 = 0;
  let weight: f64 = 0;
  let weightedX: f64 = 0;
  let weightedY: f64 = 0;
  for (let quadrant = 0; quadrant < 4; quadrant += 1) {
    const nextCell = child(cell, quadrant);
    if (nextCell == EMPTY_INDEX) continue;
    const childWeight = Math.abs(charge(nextCell));
    if (childWeight == 0) continue;
    totalCharge += charge(nextCell);
    weight += childWeight;
    weightedX += childWeight * chargeX(nextCell);
    weightedY += childWeight * chargeY(nextCell);
  }
  setCharge(cell, totalCharge);
  setChargeX(cell, weightedX / weight);
  setChargeY(cell, weightedY / weight);
}
