import { describe, expect, it } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { FGLink, FGNode } from '../../../../../src/webview/components/graph/model/build';
import {
  createGraphViewForceAdapterState,
  syncGraphViewForceAdapters,
} from '../../../../../src/webview/components/graph/runtime/physics/pluginForces';

function createEmptyContributions(): CoreGraphViewContributionSet {
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

function createFakePhysicsGraph() {
  const forces = new Map<string, unknown>([
    ['charge', { base: 'charge' }],
    ['link', { base: 'link' }],
  ]);

  return {
    forces,
    reheats: 0,
    d3Force(name: string, force?: unknown) {
      if (arguments.length === 1) {
        return forces.get(name);
      }

      if (force === null) {
        forces.delete(name);
        return undefined;
      }

      forces.set(name, force);
      return force;
    },
    d3ReheatSimulation() {
      this.reheats += 1;
    },
  };
}

describe('Graph View plugin force adapters', () => {
  it('installs additive namespaced forces and disposes them without touching base graph forces', () => {
    const graph = createFakePhysicsGraph();
    const state = createGraphViewForceAdapterState();
    const runtimeNode = {
      id: 'runtime:frontend',
      label: 'Runtime Frontend',
      color: '#84cc16',
      size: 16,
      x: 0,
    } as FGNode;
    const graphData = {
      nodes: [runtimeNode],
      links: [] as FGLink[],
    };
    let disposeCount = 0;
    const contributions: CoreGraphViewContributionSet = {
      ...createEmptyContributions(),
      forces: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.runtime-force',
          label: 'Runtime Force',
          create({ nodes }) {
            return {
              tick(alpha = 1) {
                const node = nodes.find(candidate => candidate.id === 'runtime:frontend');
                if (node) {
                  node.x = (node.x ?? 0) + alpha;
                }
              },
              dispose() {
                disposeCount += 1;
              },
            };
          },
        },
      }],
    };

    syncGraphViewForceAdapters(graph, state, contributions, graphData);

    const namespace = 'plugin:acme.graph-tools:acme.graph-tools.runtime-force';
    const installedForce = graph.d3Force(namespace) as (alpha: number) => void;
    installedForce(2);

    expect(runtimeNode.x).toBe(2);
    expect(graph.d3Force('charge')).toEqual({ base: 'charge' });
    expect(graph.d3Force('link')).toEqual({ base: 'link' });

    syncGraphViewForceAdapters(graph, state, createEmptyContributions(), graphData);

    expect(disposeCount).toBe(1);
    expect(graph.d3Force(namespace)).toBeUndefined();
    expect(graph.d3Force('charge')).toEqual({ base: 'charge' });
    expect(graph.d3Force('link')).toEqual({ base: 'link' });
  });

  it('passes timeline state to force contributions', () => {
    const graph = createFakePhysicsGraph();
    const state = createGraphViewForceAdapterState();
    const contexts: Array<{ timelineActive: boolean | undefined }> = [];
    const contributions: CoreGraphViewContributionSet = {
      ...createEmptyContributions(),
      forces: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.runtime-force',
          label: 'Runtime Force',
          create(context) {
            contexts.push({ timelineActive: context.timelineActive });
            return { dispose() {} };
          },
        },
      }],
    };

    syncGraphViewForceAdapters(
      graph,
      state,
      contributions,
      { nodes: [], links: [] },
      { timelineActive: true },
    );

    expect(contexts).toEqual([{ timelineActive: true }]);
  });
});
