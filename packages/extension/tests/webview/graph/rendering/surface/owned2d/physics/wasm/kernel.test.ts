import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GRAPH_LAYOUT_CONFIG,
  GraphNodeFlag,
} from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics';
import type { GraphLayoutState } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/contracts';
import { OwnedGraphWasmPhysicsKernel } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/wasm/kernel';

function state(
  x: readonly number[],
  y: readonly number[],
  multipliers: readonly number[] = x.map(() => 1),
  flags: readonly number[] = x.map(() => 0),
): GraphLayoutState {
  return {
    x: Float32Array.from(x),
    y: Float32Array.from(y),
    vx: new Float32Array(x.length),
    vy: new Float32Array(x.length),
    chargeStrengthMultipliers: Float32Array.from(multipliers),
    radii: new Float32Array(x.length).fill(1),
    flags: Uint8Array.from(flags),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
    linkDegrees: new Uint32Array(x.length),
  };
}

function kernel(graph: GraphLayoutState): OwnedGraphWasmPhysicsKernel {
  return new OwnedGraphWasmPhysicsKernel(
    graph,
    { ...DEFAULT_GRAPH_LAYOUT_CONFIG, centralGravity: 0, collisionIterations: 0 },
    2,
  );
}

describe('WASM Barnes-Hut charge tree', () => {
  it('builds deterministic D3-style power-of-two bounds and charge aggregates', () => {
    const physics = kernel(state(
      [-1.2, 3.1, 0.5],
      [-2.4, 1.2, 0.25],
      [1, 2, 0],
    ));

    const first = physics.rebuildBarnesHutDiagnostics(-30);
    const second = physics.rebuildBarnesHutDiagnostics(-30);

    expect(second).toEqual(first);
    expect(first.rootBounds).toEqual({ minimumX: -2, minimumY: -3, size: 8 });
    expect(first.visibleNodeCount).toBe(3);
    expect(first.rootCharge).toBe(-90);
    expect(first.rootChargeX).toBeCloseTo(
      (Math.fround(-1.2) * 30 + Math.fround(3.1) * 60) / 90,
      12,
    );
    expect(first.rootChargeY).toBeCloseTo(
      (Math.fround(-2.4) * 30 + Math.fround(1.2) * 60) / 90,
      12,
    );
  });

  it('keeps every leaf reachable when cell storage grows', () => {
    const nodeCount = 40;
    const physics = kernel(state(
      Array.from({ length: nodeCount }, (_, index) => Math.sin(index * 1.7) * 100),
      Array.from({ length: nodeCount }, (_, index) => Math.cos(index * 2.3) * 100),
    ));

    expect(physics.rebuildBarnesHutDiagnostics(-30).rootCharge)
      .toBe(-30 * nodeCount);
  });

  it('omits hidden nodes but keeps zero-strength nodes in tree topology', () => {
    const physics = kernel(state(
      [0, 10, 20],
      [0, 10, 20],
      [1, 0, 10],
      [0, 0, GraphNodeFlag.Hidden],
    ));

    const diagnostics = physics.rebuildBarnesHutDiagnostics(-30);

    expect(diagnostics.cellCount).toBeGreaterThan(1);
    expect(diagnostics).toMatchObject({
      rootCharge: -30,
      rootChargeX: 0,
      rootChargeY: 0,
      visibleNodeCount: 2,
    });
  });

  it('keeps coincident-node force output finite and byte-deterministic', () => {
    const first = kernel(state([0, 0, 0], [0, 0, 0]));
    const second = kernel(state([0, 0, 0], [0, 0, 0]));

    first.step(1, 0);
    second.step(1, 0);

    expect([...first.state.vx, ...first.state.vy].every(Number.isFinite)).toBe(true);
    expect(first.state.vx).toEqual(second.state.vx);
    expect(first.state.vy).toEqual(second.state.vy);
  });

  it('refreshes authoritative views after rare Barnes-Hut capacity growth', () => {
    const physics = kernel(state(
      [0, Math.fround(1.4e-45), Math.fround(3e38)],
      [0, 0, Math.fround(3e38)],
    ));
    const initialBuffer = physics.state.x.buffer;

    physics.step(1, 0);

    expect(physics.state.x.buffer).not.toBe(initialBuffer);
    expect([
      ...physics.state.x,
      ...physics.state.y,
      ...physics.state.vx,
      ...physics.state.vy,
    ].every(Number.isFinite)).toBe(true);
  });

  it('retries capacity overflow without double-applying a physics step', () => {
    const x = [0, Math.fround(1.4e-45), Math.fround(3e38)];
    const y = [0, 0, Math.fround(3e38)];
    const preGrown = kernel(state(x, y));
    const overflowRetry = kernel(state(x, y));
    const initialBuffer = preGrown.state.x.buffer;
    preGrown.rebuildBarnesHutDiagnostics(-30);
    expect(preGrown.state.x.buffer).not.toBe(initialBuffer);

    preGrown.step(1, 0);
    overflowRetry.step(1, 0);

    expect(overflowRetry.state.x).toEqual(preGrown.state.x);
    expect(overflowRetry.state.y).toEqual(preGrown.state.y);
    expect(overflowRetry.state.vx).toEqual(preGrown.state.vx);
    expect(overflowRetry.state.vy).toEqual(preGrown.state.vy);
    expect(overflowRetry.randomState).toBe(preGrown.randomState);
    expect(overflowRetry.collisionCorrectionCount)
      .toBe(preGrown.collisionCorrectionCount);
  });

  it('reports an empty Barnes-Hut tree without root bounds', () => {
    const physics = kernel(state([], []));

    expect(physics.rebuildBarnesHutDiagnostics(-30)).toMatchObject({
      cellCount: 0,
      rootBounds: undefined,
      rootCharge: 0,
      visibleNodeCount: 0,
    });
  });

  it('uses bounded initial tree storage sized to the graph', () => {
    expect(kernel(state([], [])).memoryBytes).toBe(131_072);
    expect(kernel(state(new Array(83).fill(0), new Array(83).fill(0))).memoryBytes)
      .toBe(196_608);
    expect(kernel(state(new Array(500).fill(0), new Array(500).fill(0))).memoryBytes)
      .toBe(458_752);
  });

  it('applies custom configuration through the raw ABI', () => {
    const graph = state([10], [0]);
    graph.vx[0] = 2;
    const physics = new OwnedGraphWasmPhysicsKernel(
      graph,
      {
        ...DEFAULT_GRAPH_LAYOUT_CONFIG,
        centralGravity: 0,
        chargeStrength: 0,
        collisionIterations: 0,
        velocityDecay: 0,
      },
      2,
    );

    physics.step(1, 0);

    expect(physics.state.x[0]).toBe(12);
    expect(physics.state.vx[0]).toBe(2);
  });

  it('rejects invalid collision cell sizes', () => {
    const physics = kernel(state([0], [0]));

    expect(() => physics.configure(DEFAULT_GRAPH_LAYOUT_CONFIG, 0))
      .toThrow('Grid cell size must be positive');
    expect(() => physics.configure(DEFAULT_GRAPH_LAYOUT_CONFIG, Number.NaN))
      .toThrow('Grid cell size must be positive');
  });

  it('publishes collision corrections and deterministic random state', () => {
    const graph = state([0, 1], [0, 0]);
    graph.radii.fill(1);
    const physics = new OwnedGraphWasmPhysicsKernel(
      graph,
      {
        ...DEFAULT_GRAPH_LAYOUT_CONFIG,
        centralGravity: 0,
        chargeStrength: 0,
        collisionIterations: 1,
        collisionStrength: 1,
        velocityDecay: 0,
      },
      2,
    );

    physics.step(1, 1);
    expect(physics.collisionCorrectionCount).toBe(1);

    const coincident = kernel(state([0, 0, 0], [0, 0, 0]));
    coincident.step(1, 0);
    expect(coincident.randomState).toBe(1_587_069_247);
  });

  it('keeps authoritative graph views in stable WASM memory across normal ticks', () => {
    const physics = kernel(state([0, 10, 20], [0, 10, 20]));
    const buffer = physics.state.x.buffer;

    for (let tick = 0; tick < 10; tick += 1) physics.step(1, 0);

    expect(physics.state.x.buffer).toBe(buffer);
    expect(physics.state.vx.buffer).toBe(buffer);
    expect(physics.memoryBytes).toBe(buffer.byteLength);
  });
});
