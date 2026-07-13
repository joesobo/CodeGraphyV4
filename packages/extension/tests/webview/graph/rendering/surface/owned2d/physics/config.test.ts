import { describe, expect, it } from 'vitest';
import { DEFAULT_GRAPH_LAYOUT_CONFIG } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import { mergeGraphLayoutConfig } from '../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/config';

describe('default graph physics configuration', () => {
  it('ships the tuned CodeGraphy force values', () => {
    expect(DEFAULT_GRAPH_LAYOUT_CONFIG).toMatchObject({
      chargeDistanceMax: Number.POSITIVE_INFINITY,
      chargeDistanceMin: 1,
      chargeStrength: -250,
      chargeTheta: 0.9,
      maximumCollisionNeighbors: 128,
      linkDistance: 80,
      linkStrength: 1,
      velocityDecay: 0.4,
      centralGravity: 0.1,
    });
  });

  it('accepts an infinite D3 maximum charge distance', () => {
    expect(mergeGraphLayoutConfig(
      { ...DEFAULT_GRAPH_LAYOUT_CONFIG },
      { chargeDistanceMax: Number.POSITIVE_INFINITY },
    ).chargeDistanceMax).toBe(Number.POSITIVE_INFINITY);
  });

  it('rejects invalid charge controls', () => {
    const merge = (update: Parameters<typeof mergeGraphLayoutConfig>[1]) => (
      mergeGraphLayoutConfig({ ...DEFAULT_GRAPH_LAYOUT_CONFIG }, update)
    );
    expect(() => merge({ chargeStrength: 1 })).toThrow('charge strength');
    expect(() => merge({ chargeDistanceMin: -1 })).toThrow('charge distance range');
    expect(() => merge({ chargeDistanceMin: 10, chargeDistanceMax: 5 }))
      .toThrow('charge distance range');
    expect(() => merge({ chargeTheta: -0.1 })).toThrow('charge theta');
  });

  it('rejects invalid integration controls and non-finite values', () => {
    const merge = (update: Parameters<typeof mergeGraphLayoutConfig>[1]) => (
      mergeGraphLayoutConfig({ ...DEFAULT_GRAPH_LAYOUT_CONFIG }, update)
    );
    expect(() => merge({ fixedTimeStepMs: 0 })).toThrow('time step');
    expect(() => merge({ linkDistance: 0 })).toThrow('link distance');
    expect(() => merge({ velocityDecay: -0.1 })).toThrow('velocity decay');
    expect(() => merge({ velocityDecay: 1.1 })).toThrow('velocity decay');
    expect(() => merge({ centralGravity: Number.NaN })).toThrow('must be finite');
  });
});
