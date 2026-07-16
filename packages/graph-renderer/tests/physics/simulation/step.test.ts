import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRAPH_LAYOUT_CONFIG } from '@graph-renderer/physics/config/model';
import type { GraphLayoutState } from '@graph-renderer/physics/contracts';
import type { GraphEngineState } from '@graph-renderer/physics/engine/state';
import { stepSimulation } from '@graph-renderer/physics/simulation/step';
import type { GraphWasmPhysicsKernel } from '@graph-renderer/physics/wasm/runtime/kernel';

function graph(x: number, vx: number): GraphLayoutState {
  return {
    x: Float32Array.of(x),
    y: Float32Array.of(0),
    vx: Float32Array.of(vx),
    vy: Float32Array.of(0),
    chargeStrengthMultipliers: Float32Array.of(1),
    radii: Float32Array.of(1),
    flags: Uint8Array.of(0),
    edgeSources: new Uint32Array(),
    edgeTargets: new Uint32Array(),
    linkDegrees: Uint32Array.of(0),
  };
}

describe('simulation step phases', () => {
  it('refreshes reallocated kernel storage before external force phases', () => {
    const original = graph(1, 0);
    const replacement = graph(1, 2);
    const kernel = {
      state: original,
      collisionCorrectionCount: 0,
      applyForces: vi.fn(function applyForces(this: { state: GraphLayoutState }) {
        this.state = replacement;
      }),
      integrate: vi.fn(() => {
        replacement.x[0] += replacement.vx[0];
        return Math.abs(replacement.vx[0]);
      }),
    } as unknown as GraphWasmPhysicsKernel;
    const state: GraphEngineState = {
      alpha: 1,
      alphaTarget: 0,
      collisionScale: 1,
      config: { ...DEFAULT_GRAPH_LAYOUT_CONFIG, alphaDecay: 0, collisionIterations: 0 },
      graph: original,
      kernel,
      maximumCollisionRadius: 1,
      nodeIds: ['node'],
      nodeIndexes: new Map([['node', 0]]),
      paused: false,
      settled: false,
      settledStepCount: 0,
    };

    stepSimulation(state, {
      beforeIntegration: () => {
        expect(state.graph).toBe(replacement);
        state.graph.vx[0] = 7;
      },
    });

    expect(kernel.applyForces).toHaveBeenCalledOnce();
    expect(kernel.integrate).toHaveBeenCalledOnce();
    expect(state.graph).toBe(replacement);
    expect(state.graph.x[0]).toBe(8);
    expect(state.graph.vx[0]).toBe(7);
    expect(original.x[0]).toBe(1);
  });
});
