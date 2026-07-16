import { describe, expect, it, vi } from 'vitest';

import { createGraphLayoutEngine } from '@graph-renderer/physics';

function forceEngine() {
  return createGraphLayoutEngine({
    nodeIds: ['node'],
    initialX: Float32Array.of(0),
    initialY: Float32Array.of(0),
    initialVx: Float32Array.of(0),
    initialVy: Float32Array.of(0),
    radii: Float32Array.of(1),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, {
    alphaDecay: 0.5,
    centralGravity: 0,
    chargeStrength: 0,
    collisionIterations: 0,
    velocityDecay: 0,
  });
}

describe('graph layout external forces', () => {
  it('runs an external force after owned forces and before integration', () => {
    const engine = forceEngine();
    const beforeIntegration = vi.fn((alpha: number) => {
      engine.setKinematics(
        engine.x,
        engine.y,
        Float32Array.of(4),
        engine.vy,
      );
      expect(alpha).toBe(0.5);
    });

    const result = engine.tick({ beforeIntegration });

    expect(result.steps).toBe(1);
    expect(beforeIntegration).toHaveBeenCalledOnce();
    expect(engine.x[0]).toBe(4);
    expect(engine.vx[0]).toBe(4);
  });

  it('lets an external force observe and override owned force velocity', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node'],
      initialX: Float32Array.of(10),
      initialY: Float32Array.of(0),
      initialVx: Float32Array.of(0),
      initialVy: Float32Array.of(0),
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 0.5,
      centralGravity: 1,
      chargeStrength: 0,
      collisionIterations: 0,
      velocityDecay: 0,
    });

    engine.tick({
      beforeIntegration: () => {
        expect(engine.vx[0]).toBe(-5);
        engine.setKinematics(engine.x, engine.y, Float32Array.of(7), engine.vy);
      },
    });

    expect(engine.vx[0]).toBe(7);
    expect(engine.x[0]).toBe(17);
  });

  it('finishes integration before surfacing an external force failure', () => {
    const engine = forceEngine();

    expect(() => engine.tick({
      beforeIntegration: () => {
        engine.setKinematics(engine.x, engine.y, Float32Array.of(4), engine.vy);
        throw new Error('external force failed');
      },
    })).toThrow('external force failed');

    expect(engine.alpha).toBe(0.5);
    expect(engine.vx[0]).toBe(4);
    expect(engine.x[0]).toBe(4);
  });

  it('runs the after-integration phase even when the first phase fails', () => {
    const engine = forceEngine();
    const afterIntegration = vi.fn(() => {
      engine.x[0] = 9;
      return { positionChanged: true };
    });

    expect(() => engine.tick({
      beforeIntegration: () => { throw new Error('before failed'); },
      afterIntegration,
    })).toThrow('before failed');

    expect(afterIntegration).toHaveBeenCalledOnce();
    expect(engine.x[0]).toBe(9);
  });

  it('does not settle with velocity introduced after integration', () => {
    const engine = createGraphLayoutEngine({
      nodeIds: ['node'],
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      alphaDecay: 1,
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 0,
      settleSpeed: 1,
      settleSteps: 1,
      velocityDecay: 0,
    });

    const result = engine.tick({
      beforeIntegration: () => undefined,
      afterIntegration: () => {
        engine.vx[0] = 10;
        return { positionChanged: false };
      },
    });

    expect(result).toEqual({ moving: true, settled: false, steps: 1 });
    expect(engine.vx[0]).toBe(10);
  });

  it('does not run external forces when the engine cannot take a step', () => {
    const paused = forceEngine();
    const pausedForce = { beforeIntegration: vi.fn() };
    paused.pause();

    expect(paused.tick(pausedForce).steps).toBe(0);
    expect(pausedForce.beforeIntegration).not.toHaveBeenCalled();

    const settled = createGraphLayoutEngine({
      nodeIds: [],
      radii: new Float32Array(),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    });
    const settledForce = { beforeIntegration: vi.fn() };

    expect(settled.tick(settledForce).steps).toBe(0);
    expect(settledForce.beforeIntegration).not.toHaveBeenCalled();
  });
});
