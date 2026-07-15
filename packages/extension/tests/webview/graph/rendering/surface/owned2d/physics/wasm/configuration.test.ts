import { describe, expect, it } from 'vitest';

import { assertOwnedGraphCollisionConfiguration } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/wasm/configuration';

describe('owned graph WASM collision configuration', () => {
  it('accepts finite positive scale and cell size', () => {
    expect(() => assertOwnedGraphCollisionConfiguration(2, 68)).not.toThrow();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid collision scale %s',
    (scale) => {
      expect(() => assertOwnedGraphCollisionConfiguration(scale, 68))
        .toThrow('Collision scale must be positive');
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects invalid collision cell size %s',
    (cellSize) => {
      expect(() => assertOwnedGraphCollisionConfiguration(2, cellSize))
        .toThrow('Grid cell size must be positive');
    },
  );
});
