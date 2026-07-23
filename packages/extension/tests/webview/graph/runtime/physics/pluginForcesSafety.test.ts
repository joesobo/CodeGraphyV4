import { describe, expect, it, vi } from 'vitest';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { FGNode } from '../../../../../src/webview/components/graph/model/build';
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

describe('owned Graph View plugin force safety', () => {
  it('applies plugin forces in contribution order so later explicit output is authoritative', () => {
    const forces = createOwnedGraphPluginForces();
    const node = { id: 'node', x: 0, y: 0, vx: 0, vy: 0 } as FGNode;
    const contributions: ExtensionGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [
        {
          pluginId: 'first',
          contribution: {
            id: 'force',
            label: 'First Force',
            create: () => ({
              dispose: vi.fn(),
              tick: () => { node.vx = 7; node.fx = 4; },
            }),
          },
        },
        {
          pluginId: 'second',
          contribution: {
            id: 'force',
            label: 'Second Force',
            create: () => ({
              dispose: vi.fn(),
              tick: () => {
                expect(node.vx).toBe(7);
                expect(node.fx).toBe(4);
                node.vx = 9;
                node.fx = 6;
              },
            }),
          },
        },
      ],
    };

    forces.sync(contributions, { nodes: [node], links: [] });
    forces.tick(0.5);

    expect(node.vx).toBe(9);
    expect(node.fx).toBe(6);
  });

  it('rolls back a failing adapter before running the next force', () => {
    const forces = createOwnedGraphPluginForces();
    const node = { id: 'node', x: 1, y: 2, vx: 3, vy: 4 } as FGNode;
    const healthyTick = vi.fn(() => {
      expect(node).toMatchObject({ x: 1, y: 2, vx: 3, vy: 4, fx: undefined });
      node.vx = 5;
    });
    const contributions: ExtensionGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [
        {
          pluginId: 'unsafe',
          contribution: {
            id: 'force',
            label: 'Unsafe Force',
            create: () => ({
              dispose: vi.fn(),
              tick: () => {
                node.x = Number.MAX_VALUE;
                node.vx = 99;
                node.fx = Number.POSITIVE_INFINITY;
              },
            }),
          },
        },
        {
          pluginId: 'healthy',
          contribution: {
            id: 'force',
            label: 'Healthy Force',
            create: () => ({ dispose: vi.fn(), tick: healthyTick }),
          },
        },
      ],
    };
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    forces.sync(contributions, { nodes: [node], links: [] });
    expect(() => forces.tick(0.5)).not.toThrow();

    expect(healthyTick).toHaveBeenCalledOnce();
    expect(node).toMatchObject({ x: 1, y: 2, vx: 5, vy: 4, fx: undefined });
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining('plugin:unsafe:force'),
      expect.any(Error),
    );
  });

  it('isolates adapter tick and disposal failures', () => {
    const forces = createOwnedGraphPluginForces();
    const healthyTick = vi.fn();
    const healthyDispose = vi.fn();
    const contributions: ExtensionGraphViewContributionSet = {
      ...emptyContributions(),
      forces: [
        {
          pluginId: 'broken',
          contribution: {
            id: 'force',
            label: 'Broken Force',
            create: () => ({
              dispose: () => { throw new Error('dispose failed'); },
              tick: () => { throw new Error('tick failed'); },
            }),
          },
        },
        {
          pluginId: 'healthy',
          contribution: {
            id: 'force',
            label: 'Healthy Force',
            create: () => ({ dispose: healthyDispose, tick: healthyTick }),
          },
        },
      ],
    };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    forces.sync(contributions, { nodes: [], links: [] });
    expect(() => forces.tick()).not.toThrow();
    expect(() => forces.dispose()).not.toThrow();

    expect(healthyTick).toHaveBeenCalledOnce();
    expect(healthyDispose).toHaveBeenCalledOnce();
    expect(forces.active()).toBe(false);
  });
});
