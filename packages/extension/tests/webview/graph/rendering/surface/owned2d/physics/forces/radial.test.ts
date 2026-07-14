import { forceRadial, forceSimulation, type SimulationNodeDatum } from 'd3-force';
import { describe, expect, it } from 'vitest';

import { applyRadialForces } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/forces/radial';
import { DEFAULT_GRAPH_LAYOUT_CONFIG } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/config';
import { createGraphLayoutState } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/initialization';
import { integrateGraphLayout } from '../../../../../../../../src/webview/components/graph/rendering/surface/owned2d/physics/integration';

describe('owned radial force', () => {
  it('matches D3 forceRadial strength one for a ranked ring', () => {
    const referenceNode: SimulationNodeDatum = { x: 50, y: 0, vx: 0, vy: 0 };
    const simulation = forceSimulation([referenceNode])
      .stop()
      .force('radial', forceRadial<SimulationNodeDatum>(100).strength(1));
    const alpha = simulation.tick().alpha();
    const state = createGraphLayoutState({
      nodeIds: ['node-0'],
      initialX: Float32Array.of(50),
      initialY: Float32Array.of(0),
      radii: Float32Array.of(1),
      edgeSources: new Uint32Array(),
      edgeTargets: new Uint32Array(),
      targetRadius: Float32Array.of(100),
    }, { ...DEFAULT_GRAPH_LAYOUT_CONFIG });

    const config = { ...DEFAULT_GRAPH_LAYOUT_CONFIG };
    applyRadialForces(state, config, alpha);
    integrateGraphLayout(state, config);

    expect(state.x[0]).toBeCloseTo(referenceNode.x!, 5);
    expect(state.y[0]).toBeCloseTo(referenceNode.y!, 5);
    expect(state.vx[0]).toBeCloseTo(referenceNode.vx!, 5);
    expect(state.vy[0]).toBeCloseTo(referenceNode.vy!, 5);
  });
});
