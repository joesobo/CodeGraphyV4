import { describe, expect, it } from 'vitest';

import { assessVisibleNodeCollisions } from '../../src/metrics/collisions';

describe('visible node collision assessment', () => {
  it('uses square-root zoom compensation for fitted-view node envelopes', () => {
    const result = assessVisibleNodeCollisions({
      nodes: [
        {
          collisionRadius: 8,
          positionFinite: true,
          screenX: 0,
          screenY: 0,
          x: 0,
          y: 0,
        },
        {
          collisionRadius: 8,
          positionFinite: true,
          screenX: 7,
          screenY: 0,
          x: 14,
          y: 0,
        },
      ],
      zoom: 0.25,
    });

    expect(result).toEqual({
      finitePositions: true,
      maximumPenetrationPx: 1,
      violations: 1,
    });
  });

  it('rejects non-finite debug snapshots', () => {
    expect(assessVisibleNodeCollisions({
      nodes: [{
        collisionRadius: 8,
        positionFinite: false,
        screenX: Number.NaN,
        screenY: 0,
        x: 0,
        y: 0,
      }],
      zoom: 0.25,
    })).toEqual({
      finitePositions: false,
      maximumPenetrationPx: Number.POSITIVE_INFINITY,
      violations: Number.MAX_SAFE_INTEGER,
    });
  });
});
