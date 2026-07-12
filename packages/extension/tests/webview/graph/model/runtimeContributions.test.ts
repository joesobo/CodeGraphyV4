import { describe, expect, it, vi } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';

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

describe('graph/model/runtimeContributions', () => {
  it('adds plugin runtime nodes and edges before Graph View model construction', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#60a5fa' },
      ],
      edges: [],
    };
    const graphViewContributions: CoreGraphViewContributionSet = {
      ...createEmptyContributions(),
      runtimeNodes: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.runtime-node',
          label: 'Runtime Node',
          createNodes() {
            return [{
              id: 'runtime:frontend',
              label: 'Frontend',
              color: '#84cc16',
              icon: 'FE',
              metadata: { owner: 'design' },
              nodeType: 'acme-runtime',
              ownerPluginId: 'acme.graph-tools',
              runtimeNodeType: 'acme.graph-tools.runtime-node',
              shape2D: 'rectangle',
              shapeSize2D: {
                height: 48,
                width: 96,
              },
              size: 36,
            } as unknown as IGraphData['nodes'][number]];
          },
        },
      }],
      runtimeEdges: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.runtime-edge',
          label: 'Runtime Edge',
          createEdges() {
            return [{
              id: 'runtime:frontend->src/App.tsx#acme:member',
              from: 'runtime:frontend',
              to: 'src/App.tsx',
              kind: 'acme:member',
              metadata: { role: 'member' },
              sources: [],
            }];
          },
        },
      }],
    };

    const graphData = buildGraphData({
      data,
      graphViewContributions,
      nodeSizeMode: 'uniform',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
    });

    expect(graphData.nodes.find(node => node.id === 'runtime:frontend')).toMatchObject({
      id: 'runtime:frontend',
      label: 'Frontend',
      icon: 'FE',
      metadata: { owner: 'design' },
      nodeType: 'acme-runtime',
      ownerPluginId: 'acme.graph-tools',
      runtimeNodeType: 'acme.graph-tools.runtime-node',
      shape2D: 'rectangle',
      shapeSize2D: {
        height: 48,
        width: 96,
      },
      size: 36,
    });
    expect(graphData.links).toEqual([
      expect.objectContaining({
        id: 'runtime:frontend->src/App.tsx#acme:member',
        from: 'runtime:frontend',
        kind: 'acme:member',
        metadata: { role: 'member' },
        to: 'src/App.tsx',
      }),
    ]);
  });

  it('applies plugin projection contributions before Graph View model construction', () => {
    const data: IGraphData = {
      nodes: [
        { id: 'src/App.tsx', label: 'App.tsx', color: '#60a5fa' },
        { id: 'src/Details.tsx', label: 'Details.tsx', color: '#60a5fa' },
      ],
      edges: [{
        id: 'src/App.tsx->src/Details.tsx#import',
        from: 'src/App.tsx',
        to: 'src/Details.tsx',
        kind: 'import',
        sources: [],
      }],
    };
    const graphViewContributions: CoreGraphViewContributionSet = {
      ...createEmptyContributions(),
      projections: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.projection',
          label: 'Runtime Projection',
          project({ visibleGraph }) {
            return {
              nodes: [{
                id: 'runtime:frontend',
                label: 'Frontend',
                color: '#84cc16',
                collapsedDescendantCount: visibleGraph.nodes.length,
                nodeType: 'acme-runtime',
              }],
              edges: [],
            };
          },
        },
      }],
    };

    const graphData = buildGraphData({
      data,
      graphViewContributions,
      nodeSizeMode: 'uniform',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
    });

    expect(graphData.nodes).toEqual([
      expect.objectContaining({
        id: 'runtime:frontend',
        collapsedDescendantCount: 2,
        nodeType: 'acme-runtime',
      }),
    ]);
    expect(graphData.links).toEqual([]);
  });

  it('passes the live graph to runtime and projection contributions', () => {
    const createNodes = vi.fn(() => []);
    const project = vi.fn(({ visibleGraph }) => visibleGraph);
    const graphViewContributions: CoreGraphViewContributionSet = {
      ...createEmptyContributions(),
      runtimeNodes: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.runtime-node',
          label: 'Runtime Node',
          createNodes,
        },
      }],
      projections: [{
        pluginId: 'acme.graph-tools',
        contribution: {
          id: 'acme.graph-tools.projection',
          label: 'Runtime Projection',
          project,
        },
      }],
    };

    buildGraphData({
      data: { nodes: [], edges: [] },
      graphViewContributions,
      nodeSizeMode: 'uniform',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
    });

    expect(createNodes).toHaveBeenCalledWith({
      visibleGraph: { nodes: [], edges: [] },
    });
    expect(project).toHaveBeenCalledWith({
      visibleGraph: { nodes: [], edges: [] },
    });
  });
});
