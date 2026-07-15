import { buildStack } from '../build/buffers';
import { collectBuildOrder } from '../build/order';
import { accumulateLeaf } from '../leaf/charge';
import { internal } from '../tree/cells';
import { accumulateInternal } from './internal';

export function accumulateTree(): void {
  const orderLength = collectBuildOrder();
  for (let order = orderLength - 1; order >= 0; order -= 1) {
    const cell = buildStack(order);
    if (internal(cell)) accumulateInternal(cell);
    else accumulateLeaf(cell);
  }
}
