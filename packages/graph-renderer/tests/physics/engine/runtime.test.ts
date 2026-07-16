import { describe, expect, it } from 'vitest';

import { createGraphLayoutEngine, GraphNodeFlag, type GraphLayoutInput } from '@graph-renderer/physics';
import { kinematicsHash, lineGraph, positionHash } from './fixture';

describe('graph layout engine', () => {
  it('uses D3 deterministic phyllotaxis for missing positions', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node-0', 'node-1', 'node-2'],
      radii: Float32Array.of(1, 1, 1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    expect(engine.x[0]).toBeCloseTo(7.071_068, 5);
    expect(engine.y[0]).toBeCloseTo(0, 5);
    expect(engine.x[1]).toBeCloseTo(-9.030_888, 5);
    expect(engine.y[1]).toBeCloseTo(8.273_033, 5);
    expect(engine.x[2]).toBeCloseTo(1.382_322, 5);
    expect(engine.y[2]).toBeCloseTo(-15.750_847, 5);
  });

  it('treats an empty graph as settled', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: [],
      radii: new Float32Array(),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    expect(engine.tick()).toEqual({ moving: false, settled: true, steps: 0 });
  });

  it('keeps an empty graph settled when force settings change', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: [],
      radii: new Float32Array(),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    engine.tick();

    engine.setConfig({ centralGravity: 0.5 });

    expect(engine.settled).toBe(true);
    expect(engine.tick()).toEqual({ moving: false, settled: true, steps: 0 });
  });

  it('reports active ticks as moving', () => {
    const engine = createGraphLayoutEngine(lineGraph(1));

    expect(engine.tick()).toEqual({ moving: true, settled: false, steps: 1 });
  });

  it('exposes the configured node radii', () => {
    const radii = Float32Array.of(2, 3);
    const chargeStrengthMultipliers = Float32Array.of(0.5, 2);
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      radii,
      chargeStrengthMultipliers,
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    expect(engine.radii).toEqual(radii);
  });

  it('exposes the configured charge multipliers', () => {
    const radii = Float32Array.of(2, 3);
    const chargeStrengthMultipliers = Float32Array.of(0.5, 2);
    const engine = createGraphLayoutEngine({
      nodeIds: ['first', 'second'],
      radii,
      chargeStrengthMultipliers,
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });

    expect(engine.chargeStrengthMultipliers).toEqual(chargeStrengthMultipliers);
  });

  it.each([
    {
      label: 'duplicate node ids',
      input: {
        nodeIds: ['duplicate', 'duplicate'],
        radii: Float32Array.of(1, 1),
        edgeSources: new Uint32Array(),
        edgeTargets: new Uint32Array(),
      },
    },
    {
      label: 'an edge to a missing node',
      input: {
        nodeIds: ['replacement'],
        radii: Float32Array.of(1),
        edgeSources: Uint32Array.of(0),
        edgeTargets: Uint32Array.of(1),
      },
    },
  ])('preserves the current graph after rejecting $label', ({ input }) => {
    const engine = createGraphLayoutEngine(lineGraph(3));
    const current = {
      edgeSources: engine.edgeSources,
      edgeTargets: engine.edgeTargets,
      nodeIds: engine.nodeIds,
      x: engine.x,
      y: engine.y,
    };

    expect(() => engine.setGraph(input)).toThrow();

    expect(engine.nodeIds).toBe(current.nodeIds);
    expect(engine.x).toBe(current.x);
    expect(engine.y).toBe(current.y);
    expect(engine.edgeSources).toBe(current.edgeSources);
    expect(engine.edgeTargets).toBe(current.edgeTargets);
    expect(engine.getNodeIndex('node-2')).toBe(2);
    expect(() => engine.tick()).not.toThrow();
  });

  it('cools D3 alpha within the Obsidian-like release-settle window', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node-0'],
      initialX: Float32Array.of(0),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      collisionIterations: 0,
      chargeStrength: 0,
    });

    engine.tick();

    expect(engine.alpha).toBeCloseTo(Math.pow(0.001, 1 / 300), 12);
    for (let tick = 1; tick < 310; tick += 1) engine.tick();
    expect(engine.settled).toBe(true);
  });

  it('produces identical positions for identical input and fixed ticks', () => {
    const first = createGraphLayoutEngine(lineGraph(64));
    const second = createGraphLayoutEngine(lineGraph(64));

    for (let tick = 0; tick < 300; tick += 1) {
      first.tick();
      second.tick();
    }

    expect(positionHash(first.x, first.y)).toBe(positionHash(second.x, second.y));
  });

  it('matches the committed radius-weighted mixed-force trajectory exactly', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['a', 'b', 'c', 'd', 'e', 'f'],
      initialX: Float32Array.of(0, 0, 24, -18, 11, -7),
      initialY: Float32Array.of(0, 0, -9, 14, 21, -16),
      initialVx: Float32Array.of(1.25, -0.75, 0.5, -1.5, 0.25, 2),
      initialVy: Float32Array.of(-0.5, 1.75, -1, 0.5, -0.25, 1),
      chargeStrengthMultipliers: Float32Array.of(1, 0.5, 1.5, 0, 2, 0.75),
      radii: Float32Array.of(8, 10, 6, 12, 9, 7),
      flags: Uint8Array.of(0, GraphNodeFlag.Pinned, 0, GraphNodeFlag.Hidden, 0, 0),
      edgeSources: Uint32Array.of(0, 0, 1, 2, 4, 5, 3),
      edgeTargets: Uint32Array.of(1, 2, 4, 5, 5, 0, 0),
    }, {
      alphaDecay: 0.031,
      alphaMinimum: 0.0005,
      centralGravity: 0.17,
      chargeDistanceMax: 240,
      chargeDistanceMin: 2.5,
      chargeStrength: -37,
      chargeTheta: 0.83,
      collisionIterations: 3,
      collisionPadding: 1.75,
      collisionStrength: 0.65,
      initializationSpacing: 11,
      linkDistance: 34,
      linkStrength: 0.42,
      settleSpeed: 0.02,
      settleSteps: 4,
      velocityDecay: 0.27,
    });
    // Regenerated when collision corrections adopted radius-squared weighting.
    const expected: ReadonlyMap<number, readonly [string, number]> = new Map([
      [1, ['2844e61b05a8b46fe89780f30daeabed71ddaa66a19c2ba32005e7a7abf47829', 0.969]],
      [4, ['acff0ebb01e71209223bd36b08d69f3f2abae9d5a04382a3a0fb465ec1b577ec', 0.8816477595209999]],
      [8, ['c9635f8860736559b47eee9a21f85463bb6c11e427a913f970fe23c4bdd45615', 0.777302771868399]],
    ]);

    for (let tick = 1; tick <= 8; tick += 1) {
      engine.tick();
      const snapshot = expected.get(tick);
      if (snapshot) {
        expect(kinematicsHash(engine)).toBe(snapshot[0]);
        expect(engine.alpha).toBe(snapshot[1]);
      }
    }
  });

  it('advances one fixed simulation step per display-frame tick', () => {
    const sixtyFrames = createGraphLayoutEngine(lineGraph(64));
    const repeatedSixtyFrames = createGraphLayoutEngine(lineGraph(64));
    const twoHundredFortyFrames = createGraphLayoutEngine(lineGraph(64));

    for (let frame = 0; frame < 60; frame += 1) {
      sixtyFrames.tick();
      repeatedSixtyFrames.tick();
    }
    for (let frame = 0; frame < 240; frame += 1) twoHundredFortyFrames.tick();

    expect(positionHash(sixtyFrames.x, sixtyFrames.y))
      .toBe(positionHash(repeatedSixtyFrames.x, repeatedSixtyFrames.y));
    expect(positionHash(sixtyFrames.x, sixtyFrames.y))
      .not.toBe(positionHash(twoHundredFortyFrames.x, twoHundredFortyFrames.y));
  });

  it('preserves deterministic repulsion state when graph storage is replaced', () => {
    const input: GraphLayoutInput = {
      nodeIds: ['first', 'second', 'third'],
      initialX: new Float32Array(3),
      initialY: new Float32Array(3),
      radii: new Float32Array(3).fill(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    };
    const config = {
      centralGravity: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    };
    const replaced = createGraphLayoutEngine(input, config);
    const retained = createGraphLayoutEngine(input, config);
    replaced.tick();
    retained.tick();

    replaced.setGraph(input);
    retained.setKinematics(
      new Float32Array(3),
      new Float32Array(3),
      new Float32Array(3),
      new Float32Array(3),
    );
    retained.reheat();
    replaced.tick();
    retained.tick();

    expect(replaced.x).toEqual(retained.x);
    expect(replaced.y).toEqual(retained.y);
    expect(replaced.vx).toEqual(retained.vx);
    expect(replaced.vy).toEqual(retained.vy);
  });

});
