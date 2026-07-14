import { describe, expect, it } from 'vitest';

import { GraphNodeFlag, type GraphLayoutState } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/contracts';
import { FlatBarnesHutTree } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/forces/barnesHut';

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

describe('flat Barnes-Hut charge tree', () => {
  it('builds deterministic D3-style power-of-two bounds and charge aggregates', () => {
    const graph = state(
      [-1.2, 3.1, 0.5],
      [-2.4, 1.2, 0.25],
      [1, 2, 0],
    );
    const tree = new FlatBarnesHutTree();

    tree.rebuild(graph, -30);
    const first = tree.diagnostics();
    tree.rebuild(graph, -30);

    expect(tree.diagnostics()).toEqual(first);
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
    const graph = state(
      Array.from({ length: nodeCount }, (_, index) => Math.sin(index * 1.7) * 100),
      Array.from({ length: nodeCount }, (_, index) => Math.cos(index * 2.3) * 100),
    );
    const tree = new FlatBarnesHutTree();

    tree.rebuild(graph, -30);

    expect(tree.diagnostics().rootCharge).toBe(-30 * nodeCount);
  });

  it('omits hidden nodes but keeps zero-strength nodes in tree topology', () => {
    const graph = state(
      [0, 10, 20],
      [0, 10, 20],
      [1, 0, 10],
      [0, 0, GraphNodeFlag.Hidden],
    );
    const tree = new FlatBarnesHutTree();

    tree.rebuild(graph, -30);

    expect(tree.cellCount).toBeGreaterThan(1);
    expect(tree.diagnostics()).toMatchObject({
      rootCharge: -30,
      rootChargeX: 0,
      rootChargeY: 0,
      visibleNodeCount: 2,
    });
  });

  it('keeps coincident-node force output finite and byte-deterministic', () => {
    const first = state([0, 0, 0], [0, 0, 0]);
    const second = state([0, 0, 0], [0, 0, 0]);
    const firstTree = new FlatBarnesHutTree();
    const secondTree = new FlatBarnesHutTree();

    firstTree.rebuild(first, -30);
    firstTree.apply(first, 1, 0.9, 1, Number.POSITIVE_INFINITY);
    secondTree.rebuild(second, -30);
    secondTree.apply(second, 1, 0.9, 1, Number.POSITIVE_INFINITY);

    expect([...first.vx, ...first.vy].every(Number.isFinite)).toBe(true);
    expect(first.vx).toEqual(second.vx);
    expect(first.vy).toEqual(second.vy);
  });
});
