import { describe, expect, it } from 'vitest';

import { graphNodeDrawnArea } from '@graph-renderer/nodeStacking';

describe('graph node stacking size', () => {
  it('uses drawn area for circular and rectangular node dimensions', () => {
    expect(graphNodeDrawnArea(16, 16)).toBe(256);
    expect(graphNodeDrawnArea(30, 12)).toBe(360);
  });
});
