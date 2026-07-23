import { describe, expect, it, vi } from 'vitest';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import { createOwnedGraphPluginForces } from '../../../../../src/webview/components/graph/rendering/surface/owned2d/plugin/forces/model';

function emptyContributions(): ExtensionGraphViewContributionSet {
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
    const contributions: ExtensionGraphViewContributionSet = {
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
    const contributions: ExtensionGraphViewContributionSet = {
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

  it('recreates adapters when only graph links change', () => {
    const forces = createOwnedGraphPluginForces();
    const nodes = [{ id: 'a' }, { id: 'b' }] as FGNode[];
    const create = vi.fn(() => ({ dispose: vi.fn() }));
    const contributions: ExtensionGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [{
        pluginId: 'acme.graph-tools',
        contribution: { id: 'force', label: 'Force', create },
      }],
    };

    forces.sync(contributions, { nodes, links: [] });
    const links = [{
      id: 'a-b',
      from: 'a',
      to: 'b',
      source: nodes[0],
      target: nodes[1],
    }] as FGLink[];
    expect(forces.sync(contributions, { nodes, links })).toBe(true);

    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenLastCalledWith(expect.objectContaining({
      edges: [expect.objectContaining({ id: 'a-b', from: 'a', to: 'b' })],
    }));
  });

  it('keeps the current adapter active when its replacement cannot be created', () => {
    const forces = createOwnedGraphPluginForces();
    const nodes = [{ id: 'a' }] as FGNode[];
    const tick = vi.fn();
    const dispose = vi.fn();
    const create = vi.fn()
      .mockReturnValueOnce({ dispose, tick })
      .mockImplementationOnce(() => { throw new Error('create failed'); });
    const contributions: ExtensionGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [{
        pluginId: 'acme.graph-tools',
        contribution: { id: 'force', label: 'Force', create },
      }],
    };
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    forces.sync(contributions, { nodes, links: [] });
    expect(forces.sync(contributions, { nodes: [...nodes], links: [] })).toBe(false);
    forces.tick();

    expect(tick).toHaveBeenCalledOnce();
    expect(dispose).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('plugin:acme.graph-tools:force'),
      expect.any(Error),
    );
  });

  it('rolls back a replacement that mutates nodes and fails initialization', () => {
    const forces = createOwnedGraphPluginForces();
    const nodes = [{ id: 'a', x: 1, y: 2, vx: 3, vy: 4 }] as FGNode[];
    const currentTick = vi.fn();
    const currentDispose = vi.fn();
    const failedDispose = vi.fn();
    const create = vi.fn()
      .mockReturnValueOnce({ dispose: currentDispose, tick: currentTick })
      .mockReturnValueOnce({
        dispose: failedDispose,
        initialize: () => {
          nodes[0].x = 99;
          nodes[0].vx = Number.MAX_VALUE;
          nodes[0].fx = Number.POSITIVE_INFINITY;
          throw new Error('initialize failed');
        },
      });
    const contributions: ExtensionGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [{
        pluginId: 'acme.graph-tools',
        contribution: { id: 'force', label: 'Force', create },
      }],
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    forces.sync(contributions, { nodes, links: [] });
    expect(forces.sync(contributions, { nodes: [...nodes], links: [] })).toBe(false);
    forces.tick();

    expect(failedDispose).toHaveBeenCalledOnce();
    expect(currentDispose).not.toHaveBeenCalled();
    expect(currentTick).toHaveBeenCalledOnce();
    expect(nodes[0]).toMatchObject({ x: 1, y: 2, vx: 3, vy: 4, fx: undefined });
  });

});
