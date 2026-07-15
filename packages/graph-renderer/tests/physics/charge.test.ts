import { describe, expect, it } from 'vitest';

import { graphNodeSizeChargeMultiplier } from '@graph-renderer/physics/charge';

describe('graph node size charge multiplier', () => {
  it.each([
    [8, 0.5],
    [16, 1],
    [30, 1.875],
    [80, 4],
  ])('maps semantic size %s to multiplier %s', (size, multiplier) => {
    expect(graphNodeSizeChargeMultiplier(size, 16)).toBe(multiplier);
  });

  it('uses neutral charge for a missing size', () => {
    expect(graphNodeSizeChargeMultiplier(undefined, 16)).toBe(1);
  });
});
