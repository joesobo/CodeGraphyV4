import { buildStack } from './buildBuffers';
import { internal } from './cells';
import { collectBuildOrder } from './buildOrder';
import { accumulateInternal } from './internalCharge';
import { accumulateLeaf } from './leafCharge';

export function accumulateTree(): void {
  const orderLength = collectBuildOrder();
  for (let order = orderLength - 1; order >= 0; order -= 1) {
    const cell = buildStack(order);
    if (internal(cell)) accumulateInternal(cell);
    else accumulateLeaf(cell);
  }
}
