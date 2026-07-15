import { describe, expect, it, vi } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import { createOwnedGraphPluginForces } from '../../../../../src/webview/components/graph/rendering/surface/owned2d/pluginForces';

function emptyContributions(): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
    nodeDragEnd: [],
    contextMenu: [],
    ui: [],
  };
}

describe('owned Graph View plugin force adapters', () => {
  it('ticks namespaced plugin forces and disposes them without replacing owned base physics', () => {
    const forces = createOwnedGraphPluginForces();
    const runtimeNode = {
      id: 'runtime:frontend',
      label: 'Runtime Frontend',
      color: '#84cc16',
      size: 16,
      x: 0,
    } as FGNode;
    const graphData = { nodes: [runtimeNode], links: [] as FGLink[] };
    const initialize = vi.fn();
    const dispose = vi.fn();
    const contributions: CoreGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.runtime-force',
          label: 'Runtime Force',
          create: () => ({
            initialize,
            tick(alpha = 1) {
              runtimeNode.x = (runtimeNode.x ?? 0) + alpha;
            },
            dispose,
          }),
        },
      }],
    };

    expect(forces.sync(contributions, graphData)).toBe(true);
    expect(initialize).toHaveBeenCalledWith(graphData.nodes);
    expect(forces.active()).toBe(true);
    forces.tick(2);
    expect(runtimeNode.x).toBe(2);

    expect(forces.sync(contributions, graphData)).toBe(false);
    expect(dispose).not.toHaveBeenCalled();
    expect(forces.sync(emptyContributions(), graphData)).toBe(true);
    expect(dispose).toHaveBeenCalledOnce();
    expect(forces.active()).toBe(false);
  });

  it('recreates adapters when physics settings change and disposes all adapters on teardown', () => {
    const forces = createOwnedGraphPluginForces();
    const graphData = { nodes: [] as FGNode[], links: [] as FGLink[] };
    const dispose = vi.fn();
    const create = vi.fn(() => ({ dispose }));
    const contributions: CoreGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [{
        pluginId: 'acme.graph-tools',
        contribution: { id: 'force', label: 'Force', create },
      }],
    };

    const initialPhysicsSettings = {
      repelForce: 10,
      linkDistance: 80,
      linkForce: 0.15,
      damping: 0.7,
      centerForce: 0.1,
    };
    forces.sync(contributions, graphData, initialPhysicsSettings);
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      physicsSettings: initialPhysicsSettings,
    }));

    forces.sync(contributions, graphData, {
      repelForce: 20,
      linkDistance: 80,
      linkForce: 0.15,
      damping: 0.7,
      centerForce: 0.1,
    });

    expect(create).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledOnce();
    forces.dispose();
    expect(dispose).toHaveBeenCalledTimes(2);
  });
});
