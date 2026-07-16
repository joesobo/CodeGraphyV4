import { describe, expect, it } from 'vitest';

import {
  createGraphNodeStackingOrder,
  graphNodeDrawnArea,
} from '@graph-renderer/nodeStacking';

describe('graph node stacking', () => {
  it('uses drawn area for circular and rectangular node dimensions', () => {
    expect(graphNodeDrawnArea(16, 16)).toBe(256);
    expect(graphNodeDrawnArea(30, 12)).toBe(360);
  });

  it('orders nodes by ascending drawn area so larger nodes paint last', () => {
    const order = createGraphNodeStackingOrder([
      { width: 30, height: 20 },
      { width: 10, height: 10 },
      { width: 20, height: 10 },
    ]);

    expect(Array.from(order)).toEqual([1, 2, 0]);
  });

  it('uses graph index as the stable tie breaker', () => {
    const order = createGraphNodeStackingOrder([
      { width: 10, height: 20 },
      { width: 20, height: 10 },
      { width: Number.NaN, height: 100 },
    ]);

    expect(Array.from(order)).toEqual([2, 0, 1]);
  });
});
