import { describe, expect, it } from 'vitest';

import {
  createGraphLayoutEngine,
  MAX_GRAPH_CHARGE_MULTIPLIER,
  MAX_GRAPH_COORDINATE,
  MAX_GRAPH_RADIUS,
  MAX_GRAPH_VELOCITY,
  type GraphLayoutInput,
} from '@graph-renderer/physics';

function input(overrides: Partial<GraphLayoutInput> = {}): GraphLayoutInput {
  return {
    nodeIds: ['node'],
    initialX: Float32Array.of(0),
    initialY: Float32Array.of(0),
    initialVx: Float32Array.of(0),
    initialVy: Float32Array.of(0),
    chargeStrengthMultipliers: Float32Array.of(1),
    radii: Float32Array.of(1),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
    ...overrides,
  };
}

describe('graph layout numerical input domains', () => {
  it.each([
    ['initialX', Float32Array.of(MAX_GRAPH_COORDINATE * 2)],
    ['initialY', Float32Array.of(-MAX_GRAPH_COORDINATE * 2)],
    ['initialVx', Float32Array.of(MAX_GRAPH_VELOCITY * 2)],
    ['initialVy', Float32Array.of(-MAX_GRAPH_VELOCITY * 2)],
    ['chargeStrengthMultipliers', Float32Array.of(MAX_GRAPH_CHARGE_MULTIPLIER + 1)],
    ['radii', Float32Array.of(MAX_GRAPH_RADIUS + 1)],
  ] as const)('rejects %s values outside the supported domain', (field, values) => {
    expect(() => createGraphLayoutEngine(input({ [field]: values }))).toThrow(/at most/);
  });

  it('accepts every public input maximum and keeps the first step finite', () => {
    const engine = createGraphLayoutEngine(input({
      initialX: Float32Array.of(MAX_GRAPH_COORDINATE),
      initialY: Float32Array.of(-MAX_GRAPH_COORDINATE),
      initialVx: Float32Array.of(MAX_GRAPH_VELOCITY),
      initialVy: Float32Array.of(-MAX_GRAPH_VELOCITY),
      chargeStrengthMultipliers: Float32Array.of(MAX_GRAPH_CHARGE_MULTIPLIER),
      radii: Float32Array.of(MAX_GRAPH_RADIUS),
    }), {
      centralGravity: 1,
      chargeStrength: -10_000,
      collisionIterations: 0,
      linkStrength: 10,
    });

    engine.tick();

    expect([...engine.x, ...engine.y, ...engine.vx, ...engine.vy].every(Number.isFinite))
      .toBe(true);
  });

  it('rejects replacement input atomically', () => {
    const engine = createGraphLayoutEngine(input());

    expect(() => engine.setGraph(input({
      chargeStrengthMultipliers: Float32Array.of(MAX_GRAPH_CHARGE_MULTIPLIER + 1),
    }))).toThrow(/chargeStrengthMultipliers/);

    expect(engine.nodeIds).toEqual(['node']);
    expect(engine.chargeStrengthMultipliers).toEqual(Float32Array.of(1));
  });
});
