import { describe, expect, it } from 'vitest';
import { DEFAULT_GRAPH_LAYOUT_CONFIG } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';

describe('default graph physics configuration', () => {
  it('ships the tuned CodeGraphy force values', () => {
    expect(DEFAULT_GRAPH_LAYOUT_CONFIG).toMatchObject({
      chargeStrength: -250,
      maximumCollisionNeighbors: 128,
      linkDistance: 80,
      linkStrength: 0.15,
      velocityDecay: 0.4,
      centralGravity: 0.1,
    });
  });
});
