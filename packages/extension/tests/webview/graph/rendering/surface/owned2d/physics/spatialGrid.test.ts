import { describe, expect, it, vi } from 'vitest';

import { UniformGrid } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/spatialGrid';

describe('UniformGrid', () => {
  it('visits nodes in the same or adjacent cells without scanning distant cells', () => {
    const grid = new UniformGrid(10);
    grid.rebuild(
      Float32Array.from([0, 9, 29, 100]),
      Float32Array.from([0, 0, 0, 100]),
      new Uint8Array(4),
      2,
    );
    const visit = vi.fn();

    grid.forEachNearby(0, 16, visit);

    expect(visit.mock.calls.map(([index]) => index).sort()).toEqual([1]);
  });
});
