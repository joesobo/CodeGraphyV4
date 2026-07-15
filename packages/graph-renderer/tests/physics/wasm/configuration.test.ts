import { describe, expect, it } from 'vitest';

import { assertGraphCollisionConfiguration } from '@graph-renderer/physics/wasm/configuration';

describe('graph WASM collision configuration', () => {
  it('accepts finite positive scale and cell size', () => {
    expect(() => assertGraphCollisionConfiguration(2, 68)).not.toThrow();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid collision scale %s',
    (scale) => {
      expect(() => assertGraphCollisionConfiguration(scale, 68))
        .toThrow('Collision scale must be positive');
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid collision cell size %s',
    (cellSize) => {
      expect(() => assertGraphCollisionConfiguration(2, cellSize))
        .toThrow('Grid cell size must be positive');
    },
  );
});
