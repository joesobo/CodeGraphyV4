import { describe, expect, it, vi } from 'vitest';

import type { GraphLayoutState } from '@graph-renderer/physics/contracts';
import type { GraphPhysicsExports } from '@graph-renderer/physics/wasm/abi';
import { GraphPhysicsStorage } from '@graph-renderer/physics/wasm/storage';

function graphState(): GraphLayoutState {
  return {
    x: Float32Array.of(1, 2, 3),
    y: Float32Array.of(4, 5, 6),
    vx: Float32Array.of(7, 8, 9),
    vy: Float32Array.of(10, 11, 12),
    chargeStrengthMultipliers: Float32Array.of(0.5, 1, 1.5),
    radii: Float32Array.of(8, 9, 10),
    flags: Uint8Array.of(0, 1, 2),
    edgeSources: Uint32Array.of(0, 1),
    edgeTargets: Uint32Array.of(1, 2),
    linkDegrees: Uint32Array.of(1, 2, 1),
  };
}

describe('graph WASM physics storage', () => {
  it('copies every graph buffer into one independent WASM memory', () => {
    const source = graphState();
    const storage = new GraphPhysicsStorage(source, 256);

    expect(storage.state).toEqual(source);
    expect(storage.state.x).not.toBe(source.x);
    for (const values of Object.values(storage.state)) {
      expect(values.buffer).toBe(storage.memory.buffer);
    }
    expect(storage.memory.buffer.byteLength).toBe(131_072);
    source.x[0] = 99;
    expect(storage.state.x[0]).toBe(1);
  });

  it('publishes every memory-region pointer through the raw ABI', () => {
    const storage = new GraphPhysicsStorage(graphState(), 256);
    const initializeResult = vi.fn();
    const initializeGraph = vi.fn();
    const initializeRepulsion = vi.fn();
    const initializeCollision = vi.fn();
    const exports = {
      initializeResult,
      initializeGraph,
      initializeRepulsion,
      initializeCollision,
    } as unknown as GraphPhysicsExports;
    const layout = storage.layout;

    storage.initialize(exports);

    expect(initializeResult).toHaveBeenCalledWith(layout.result.offset);
    expect(initializeGraph).toHaveBeenCalledWith(
      3,
      2,
      layout.x.offset,
      layout.y.offset,
      layout.vx.offset,
      layout.vy.offset,
      layout.multipliers.offset,
      layout.radii.offset,
      layout.flags.offset,
      layout.edgeSources.offset,
      layout.edgeTargets.offset,
      layout.linkDegrees.offset,
    );
    expect(initializeRepulsion).toHaveBeenCalledWith(
      layout.barnesHutChildren.offset,
      layout.barnesHutInternal.offset,
      layout.barnesHutLeafHeads.offset,
      layout.barnesHutNextCoincident.offset,
      layout.barnesHutStrengths.offset,
      layout.barnesHutCharges.offset,
      layout.barnesHutChargeX.offset,
      layout.barnesHutChargeY.offset,
      layout.barnesHutBuildStack.offset,
      layout.barnesHutBuildTraversal.offset,
      layout.barnesHutTraversalCells.offset,
      layout.barnesHutTraversalX.offset,
      layout.barnesHutTraversalY.offset,
      layout.barnesHutTraversalSize.offset,
      256,
    );
    expect(initializeCollision).toHaveBeenCalledWith(
      layout.collisionNext.offset,
      layout.collisionCellX.offset,
      layout.collisionCellY.offset,
      layout.collisionHashKeys.offset,
      layout.collisionHashHeads.offset,
      layout.collisionHashUsed.offset,
      layout.hashCapacity,
    );
  });

  it('copies authoritative views directly into replacement WASM memory', () => {
    const original = new GraphPhysicsStorage(graphState(), 256);

    const replacement = new GraphPhysicsStorage(original.state, 512);

    expect(replacement.state).toEqual(original.state);
    expect(replacement.memory.buffer).not.toBe(original.memory.buffer);
    replacement.state.x[0] = 99;
    expect(original.state.x[0]).toBe(1);
  });
});
