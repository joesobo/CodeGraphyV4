import { describe, expect, it } from 'vitest';

import { assertGraphCollisionCellSize } from '@graph-renderer/physics/wasm/abi/configuration';

describe('graph WASM collision configuration', () => {
  it('accepts a finite positive semantic-radius cell size', () => {
    expect(() => assertGraphCollisionCellSize(68)).not.toThrow();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid collision cell size %s',
    (cellSize) => {
      expect(() => assertGraphCollisionCellSize(cellSize))
        .toThrow('Grid cell size must be positive');
    },
  );
});
