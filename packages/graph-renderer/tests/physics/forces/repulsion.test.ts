import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine } from '@graph-renderer/physics';

type ReferencePoint = readonly [index: number, x: number, y: number];

function repulsionEngine(nodeCount: number) {
  return createGraphLayoutEngine({
    nodeIds: Array.from({ length: nodeCount }, (_, index) => `node-${index}`),
    initialX: Float32Array.from(
      { length: nodeCount },
      (_, index) => Math.sin(index * 1.7 + 0.31) * 350 + index * 0.037,
    ),
    initialY: Float32Array.from(
      { length: nodeCount },
      (_, index) => Math.cos(index * 2.3 + 0.73) * 280 - index * 0.021,
    ),
    chargeStrengthMultipliers: Float32Array.from(
      { length: nodeCount },
      (_, index) => 0.5 + (index % 5) * 0.25,
    ),
    radii: new Float32Array(nodeCount).fill(1),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, {
    alphaDecay: 0,
    centralGravity: 0,
    chargeDistanceMax: 400,
    chargeDistanceMin: 1,
    chargeStrength: -30,
    chargeTheta: 0.9,
    collisionIterations: 0,
    velocityDecay: 0,
  });
}

function expectReferencePoints(
  engine: ReturnType<typeof repulsionEngine>,
  points: readonly ReferencePoint[],
): void {
  for (const [index, x, y] of points) {
    expect(engine.x[index]).toBeCloseTo(x, 1);
    expect(engine.y[index]).toBeCloseTo(y, 1);
  }
}

function deterministicBarnesHutTrajectory(): { x: Float32Array; y: Float32Array } {
  const engine = repulsionEngine(1_000);
  for (let tick = 0; tick < 10; tick += 1) engine.tick();
  return { x: new Float32Array(engine.x), y: new Float32Array(engine.y) };
}

describe('graph WASM many-body force', () => {
  it('leaves positions unchanged when global repulsion is disabled', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['left', 'right'],
      initialX: Float32Array.of(-20, 20),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    });

    engine.tick();

    expect(engine.x).toEqual(Float32Array.of(-20, 20));
    expect(engine.y).toEqual(Float32Array.of(0, 0));
  });

  it('matches the exact three-node reference impulses', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['left', 'middle', 'right'],
      initialX: Float32Array.of(0, 100, 250),
      initialY: Float32Array.of(0, 0, 0),
      radii: Float32Array.of(1, 1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
      chargeStrength: -30,
      chargeTheta: 0,
    });

    engine.tick();

    [-0.42, 100.1, 250.32].forEach((value, index) => {
      expect(engine.x[index]).toBeCloseTo(value, 4);
    });
    [-0.42, 0.1, 0.32].forEach((value, index) => {
      expect(engine.vx[index]).toBeCloseTo(value, 4);
    });
  });

  it('matches the reference minimum and maximum charge distances', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['near-a', 'near-b', 'far'],
      initialX: Float32Array.of(0, 0.25, 100),
      initialY: Float32Array.of(0, 0.125, 20),
      radii: Float32Array.of(1, 1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0,
      centralGravity: 0,
      chargeDistanceMax: 50,
      chargeDistanceMin: 2,
      chargeStrength: -30,
      chargeTheta: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    });

    engine.tick();

    expectReferencePoints(engine, [
      [0, -13.416407865, -6.708203932],
      [1, 13.666407865, 6.833203932],
      [2, 100, 20],
    ]);
  });

  it.each([
    [100, 5, [
      [0, 102.475990707, 214.948477823],
      [13, -139.112700568, 224.044962626],
      [42, 162.559128393, -317.781572526],
      [99, -326.537031212, -225.414177763],
    ]],
    [500, 1, [
      [0, 101.653454634, 215.771590556],
      [13, -141.826256251, 204.330076515],
      [42, 178.333422899, -294.906346135],
      [499, 149.571284058, 40.960869686],
    ]],
    [750, 1, [
      [0, 96.878809977, 219.194315747],
      [13, -142.616925571, 204.945526835],
      [42, 180.009637806, -304.202644534],
      [749, -323.337887615, -89.003809767],
    ]],
    [1_000, 1, [
      [0, 105.228632861, 218.466783858],
      [13, -138.80847642, 199.884456196],
      [42, 165.356340046, -311.674571064],
      [999, 350.690237238, 78.247602962],
    ]],
  ] as const)(
    'matches committed %i-node reference vectors',
    (nodeCount, tickCount, points) => {
      const engine = repulsionEngine(nodeCount);
      for (let tick = 0; tick < tickCount; tick += 1) engine.tick();
      expectReferencePoints(engine, points);
    },
  );

  it('produces byte-identical multi-tick Barnes-Hut trajectories', () => {
    const first = deterministicBarnesHutTrajectory();
    const second = deterministicBarnesHutTrajectory();

    expect(first.x).toEqual(second.x);
    expect(first.y).toEqual(second.y);
  });
});
