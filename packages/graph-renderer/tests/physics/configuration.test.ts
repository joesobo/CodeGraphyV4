import { describe, expect, it } from 'vitest';

import {
  createGraphLayoutEngine,
  MAX_GRAPH_CENTRAL_GRAVITY,
  MAX_GRAPH_CHARGE_DISTANCE,
  MAX_GRAPH_CHARGE_STRENGTH,
  MAX_GRAPH_CHARGE_THETA,
  MAX_GRAPH_COLLISION_PADDING,
  MAX_GRAPH_INITIALIZATION_SPACING,
  MAX_GRAPH_LINK_DISTANCE,
  MAX_GRAPH_LINK_STRENGTH,
  MAX_GRAPH_SETTLE_SPEED,
  type GraphLayoutConfig,
  type GraphLayoutEngine,
} from '@graph-renderer/physics';

function engineFixture(): GraphLayoutEngine {
  return createGraphLayoutEngine({
    nodeIds: ['node'],
    initialX: Float32Array.of(10),
    initialY: Float32Array.of(0),
    radii: Float32Array.of(1),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  });
}

function kinematics(engine: GraphLayoutEngine): number[] {
  return [...engine.x, ...engine.y, ...engine.vx, ...engine.vy];
}

describe('graph layout configuration validation', () => {
  it.each([
    ['alphaDecay', -0.01],
    ['alphaDecay', 1.01],
    ['alphaMinimum', -0.01],
    ['alphaMinimum', 1.01],
    ['centralGravity', -1],
    ['centralGravity', MAX_GRAPH_CENTRAL_GRAVITY + 0.01],
    ['chargeDistanceMax', MAX_GRAPH_CHARGE_DISTANCE + 1],
    ['chargeDistanceMin', MAX_GRAPH_CHARGE_DISTANCE + 1],
    ['chargeStrength', -MAX_GRAPH_CHARGE_STRENGTH - 1],
    ['chargeTheta', MAX_GRAPH_CHARGE_THETA + 0.01],
    ['collisionIterations', -1],
    ['collisionIterations', 1.5],
    ['collisionIterations', 65],
    ['collisionPadding', -1],
    ['collisionPadding', MAX_GRAPH_COLLISION_PADDING + 1],
    ['collisionStrength', -0.01],
    ['collisionStrength', 1.01],
    ['initializationSpacing', 0],
    ['initializationSpacing', MAX_GRAPH_INITIALIZATION_SPACING + 1],
    ['linkDistance', MAX_GRAPH_LINK_DISTANCE + 1],
    ['linkStrength', -0.01],
    ['linkStrength', MAX_GRAPH_LINK_STRENGTH + 0.01],
    ['settleSpeed', -0.01],
    ['settleSpeed', MAX_GRAPH_SETTLE_SPEED + 1],
    ['settleSteps', 0],
    ['settleSteps', 1.5],
    ['settleSteps', Number.MAX_SAFE_INTEGER + 1],
  ] satisfies Array<[keyof GraphLayoutConfig, number]>) (
    'rejects %s=%s atomically',
    (key, value) => {
      const candidate = engineFixture();
      const unchanged = engineFixture();

      expect(() => candidate.setConfig({ [key]: value })).toThrow();
      candidate.tick();
      unchanged.tick();

      expect(candidate.alpha).toBe(unchanged.alpha);
      expect(kinematics(candidate)).toEqual(kinematics(unchanged));
    },
  );

  it.each([
    'centralGravity',
    'chargeDistanceMin',
    'chargeStrength',
    'chargeTheta',
    'collisionPadding',
    'collisionStrength',
    'initializationSpacing',
    'linkDistance',
    'linkStrength',
    'settleSpeed',
  ] satisfies Array<keyof GraphLayoutConfig>)(
    'rejects %s values that overflow Float32 storage',
    (key) => {
      const engine = engineFixture();
      expect(() => engine.setConfig({ [key]: Number.MAX_VALUE }))
        .toThrow(/32-bit float/);
    },
  );

  it('keeps ordinary graph kinematics finite at every accepted force maximum', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['left', 'right'],
      initialX: Float32Array.of(-1_000, 1_000),
      initialY: Float32Array.of(-500, 500),
      chargeStrengthMultipliers: Float32Array.of(4, 4),
      radii: Float32Array.of(100, 100),
      edgeSources: Uint32Array.of(0),
      edgeTargets: Uint32Array.of(1),
    }, {
      centralGravity: MAX_GRAPH_CENTRAL_GRAVITY,
      chargeDistanceMax: MAX_GRAPH_CHARGE_DISTANCE,
      chargeDistanceMin: 1,
      chargeStrength: -MAX_GRAPH_CHARGE_STRENGTH,
      chargeTheta: MAX_GRAPH_CHARGE_THETA,
      collisionPadding: MAX_GRAPH_COLLISION_PADDING,
      initializationSpacing: MAX_GRAPH_INITIALIZATION_SPACING,
      linkDistance: MAX_GRAPH_LINK_DISTANCE,
      linkStrength: MAX_GRAPH_LINK_STRENGTH,
      settleSpeed: MAX_GRAPH_SETTLE_SPEED,
    });

    engine.tick();

    expect([...engine.x, ...engine.y, ...engine.vx, ...engine.vy].every(Number.isFinite))
      .toBe(true);
    expect(Math.max(...engine.x.map(Math.abs))).toBeGreaterThan(100);
  });

  it('accepts supported boundary values', () => {
    const engine = engineFixture();

    expect(() => engine.setConfig({
      alphaDecay: 0,
      alphaMinimum: 0,
      centralGravity: MAX_GRAPH_CENTRAL_GRAVITY,
      chargeDistanceMax: MAX_GRAPH_CHARGE_DISTANCE,
      chargeDistanceMin: MAX_GRAPH_CHARGE_DISTANCE,
      chargeStrength: -MAX_GRAPH_CHARGE_STRENGTH,
      chargeTheta: MAX_GRAPH_CHARGE_THETA,
      collisionIterations: 0,
      collisionPadding: MAX_GRAPH_COLLISION_PADDING,
      collisionStrength: 0,
      initializationSpacing: MAX_GRAPH_INITIALIZATION_SPACING,
      linkDistance: MAX_GRAPH_LINK_DISTANCE,
      linkStrength: MAX_GRAPH_LINK_STRENGTH,
      settleSpeed: MAX_GRAPH_SETTLE_SPEED,
      settleSteps: 86_400,
      velocityDecay: 1,
    })).not.toThrow();

    expect(() => engine.setConfig({
      alphaDecay: 1,
      alphaMinimum: 1,
      collisionIterations: 64,
      collisionStrength: 1,
      velocityDecay: 0,
    })).not.toThrow();
  });
});
