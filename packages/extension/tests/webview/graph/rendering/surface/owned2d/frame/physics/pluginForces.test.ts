import { createGraphLayoutEngine } from '@codegraphy-dev/graph-renderer';
import { describe, expect, it, vi } from 'vitest';
import type { FGNode } from '../../../../../../../../src/webview/components/graph/model/build';
import type { OwnedGraphFrameRuntime } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/runtime/render';
import { advanceOwnedGraphPhysics } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/physics/advance';
import {
  createOwnedGraphExternalForce,
  importOwnedPluginKinematics,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/frame/physics/pluginForces';
import type { OwnedGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/layout/runtime/model';
import { createGraphLayoutFixedTimestepClock } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/simulation/timing/clock';

function physicsFixture(tick: (node: FGNode, alpha?: number) => void): {
  layout: OwnedGraphLayout;
  node: FGNode;
  runtime: OwnedGraphFrameRuntime;
} {
  const node = { id: 'node', x: 0, y: 0, vx: 0, vy: 0 } as FGNode;
  const engine = createGraphLayoutEngine({
    nodeIds: [node.id],
    initialX: Float32Array.of(0),
    initialY: Float32Array.of(0),
    initialVx: Float32Array.of(0),
    initialVy: Float32Array.of(0),
    radii: Float32Array.of(1),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
  }, {
    centralGravity: 0,
    chargeStrength: 0,
    collisionIterations: 0,
    velocityDecay: 0,
  });
  const layout = { engine, links: [], nodes: [node] } as OwnedGraphLayout;
  const runtime = {
    cameraRef: { current: { centerX: 0, centerY: 0, zoom: 1 } },
    engineStopNotifiedRef: { current: false },
    pluginForcesRef: {
      current: {
        active: () => true,
        dispose: vi.fn(),
        sync: vi.fn(),
        tick: vi.fn((alpha?: number) => {
          tick(node, alpha);
          return true;
        }),
      },
    },
    pointerSessionRef: { current: null },
    positionVersionRef: { current: 0 },
    rendererOperationalRef: { current: true },
    simulationClockRef: { current: createGraphLayoutFixedTimestepClock() },
    synchronizedPositionVersionRef: { current: 0 },
  } as unknown as OwnedGraphFrameRuntime;
  return { layout, node, runtime };
}

describe('owned graph frame plugin forces', () => {
  it('imports valid initialization kinematics and fixed coordinates before the first step', () => {
    const { layout, node } = physicsFixture(() => undefined);
    node.x = 12;
    node.vx = 3;
    node.fx = 8;

    const result = importOwnedPluginKinematics(layout);

    expect(result).toEqual({ changed: true, positionChanged: true });
    expect(layout.engine.x[0]).toBe(8);
    expect(layout.engine.vx[0]).toBe(0);
  });

  it('keeps each fixed axis authoritative through integration while the other axis moves', () => {
    const { layout, runtime } = physicsFixture((node) => {
      node.fx = 10;
      node.vx = 100;
      node.vy = 3;
    });

    layout.engine.tick(createOwnedGraphExternalForce(runtime, layout));

    expect(layout.engine.x[0]).toBe(10);
    expect(layout.engine.vx[0]).toBe(0);
    expect(layout.engine.y[0]).toBe(3);
    expect(layout.engine.vy[0]).toBe(3);
  });

  it('supports fy-only fixing without freezing the x axis', () => {
    const { layout, runtime } = physicsFixture((node) => {
      node.fy = 11;
      node.vx = 2;
      node.vy = 100;
    });

    layout.engine.tick(createOwnedGraphExternalForce(runtime, layout));

    expect(layout.engine.x[0]).toBe(2);
    expect(layout.engine.vx[0]).toBe(2);
    expect(layout.engine.y[0]).toBe(11);
    expect(layout.engine.vy[0]).toBe(0);
  });

  it('reasserts fixed coordinates after collision correction', () => {
    const fixed = { id: 'fixed', x: 0, y: 0, vx: 0, vy: 0 } as FGNode;
    const other = { id: 'other', x: 0, y: 0, vx: 0, vy: 0 } as FGNode;
    const engine = createGraphLayoutEngine({
      nodeIds: [fixed.id, other.id],
      initialX: Float32Array.of(0, 0),
      initialY: Float32Array.of(0, 0),
      radii: Float32Array.of(10, 10),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
    }, {
      centralGravity: 0,
      chargeStrength: 0,
      collisionIterations: 1,
      collisionStrength: 1,
      velocityDecay: 0,
    });
    const { runtime } = physicsFixture(() => undefined);
    runtime.pluginForcesRef.current.tick = vi.fn(() => {
      fixed.fx = 0;
      fixed.fy = 0;
      return true;
    });
    const layout = { engine, links: [], nodes: [fixed, other] } as OwnedGraphLayout;

    engine.tick(createOwnedGraphExternalForce(runtime, layout));

    expect(engine.x[0]).toBe(0);
    expect(engine.y[0]).toBe(0);
    expect(engine.vx[0]).toBe(0);
    expect(engine.vy[0]).toBe(0);
    expect(Math.hypot(engine.x[1], engine.y[1])).toBeGreaterThan(0);
  });

  it('updates and clears plugin fixed coordinates so physics can resume', () => {
    let fixedX: number | undefined = 10;
    const { layout, runtime } = physicsFixture((node) => {
      node.fx = fixedX;
      node.vx = 2;
    });
    const externalForce = createOwnedGraphExternalForce(runtime, layout);

    layout.engine.tick(externalForce);
    expect(layout.engine.x[0]).toBe(10);

    fixedX = 20;
    layout.engine.tick(externalForce);
    expect(layout.engine.x[0]).toBe(20);

    fixedX = undefined;
    layout.engine.tick(externalForce);
    expect(layout.engine.x[0]).toBe(22);
    expect(layout.engine.vx[0]).toBe(2);
  });

  it('clears plugin fixed coordinates without releasing a user pin', () => {
    let fixedX: number | undefined = 10;
    const { layout, runtime } = physicsFixture((node) => {
      node.fx = fixedX;
      node.vx = 5;
    });
    const externalForce = createOwnedGraphExternalForce(runtime, layout);

    layout.engine.tick(externalForce);
    expect(layout.engine.x[0]).toBe(10);

    layout.engine.pin(0);
    fixedX = undefined;
    layout.engine.tick(externalForce);
    expect(layout.engine.x[0]).toBe(10);
    expect(layout.engine.flags[0] & 1).toBe(1);
  });

  it('runs plugin forces once per fixed physics step with that step alpha', () => {
    const alphas: number[] = [];
    const { layout, runtime } = physicsFixture((_node, alpha) => {
      alphas.push(alpha as number);
    });

    const first = advanceOwnedGraphPhysics(runtime, layout, 0);
    const second = advanceOwnedGraphPhysics(runtime, layout, 1_000 / 60);

    expect(first.tick.steps).toBe(1);
    expect(second.tick.steps).toBe(2);
    expect(runtime.pluginForcesRef.current.tick).toHaveBeenCalledTimes(3);
    expect(alphas).toEqual([
      Math.pow(0.001, 1 / 300),
      Math.pow(0.001, 2 / 300),
      Math.pow(0.001, 3 / 300),
    ].map(value => expect.closeTo(value, 12)));
  });

  it('runs one plugin force step after direct node movement requires an immediate physics step', () => {
    const { layout, runtime } = physicsFixture(() => undefined);
    runtime.simulationClockRef.current.lastFrameTimestampMs = 100;
    runtime.positionVersionRef.current += 1;

    const result = advanceOwnedGraphPhysics(runtime, layout, 100);

    expect(result.tick.steps).toBe(1);
    expect(runtime.pluginForcesRef.current.tick).toHaveBeenCalledOnce();
  });

  it('does not run plugin forces when no fixed step is due, even while a pointer is held', () => {
    const { layout, runtime } = physicsFixture(() => undefined);
    runtime.simulationClockRef.current.lastFrameTimestampMs = 100;
    runtime.pointerSessionRef.current = {} as never;

    const result = advanceOwnedGraphPhysics(runtime, layout, 100);

    expect(result.tick.steps).toBe(0);
    expect(runtime.pluginForcesRef.current.tick).not.toHaveBeenCalled();
  });

  it('does not run plugin forces after the simulation has settled', () => {
    const { layout, runtime } = physicsFixture(() => undefined);
    while (!layout.engine.settled) layout.engine.tick();
    vi.mocked(runtime.pluginForcesRef.current.tick).mockClear();

    const result = advanceOwnedGraphPhysics(runtime, layout, 100);

    expect(result.tick.steps).toBe(0);
    expect(runtime.pluginForcesRef.current.tick).not.toHaveBeenCalled();
  });

  it('applies plugin velocity before normal integration in the same step', () => {
    const { layout, node, runtime } = physicsFixture((current) => {
      current.vx = 4;
    });

    advanceOwnedGraphPhysics(runtime, layout, 0);

    expect(layout.engine.x[0]).toBe(4);
    expect(layout.engine.vx[0]).toBe(4);
    expect(node.x).toBe(0);
  });

  it.each([
    ['x', Number.MAX_VALUE],
    ['x', 100_000_001],
    ['fx', Number.MAX_VALUE],
    ['fy', Number.NaN],
    ['vx', Number.POSITIVE_INFINITY],
  ] as const)(
    'rejects unsafe plugin %s=%s without corrupting engine state',
    (field, unsafe) => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { layout, runtime } = physicsFixture((node) => {
        node[field] = unsafe;
      });

      expect(() => advanceOwnedGraphPhysics(runtime, layout, 0)).not.toThrow();

      expect([...layout.engine.x, ...layout.engine.y, ...layout.engine.vx, ...layout.engine.vy]
        .every(Number.isFinite)).toBe(true);
      expect(layout.engine.x[0]).toBe(0);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('Plugin graph force produced invalid kinematics'),
        expect.any(Error),
      );
    },
  );
});
