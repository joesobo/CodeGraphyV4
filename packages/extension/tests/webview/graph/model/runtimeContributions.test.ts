import { describe, expect, it, vi } from 'vitest';
import type { ExtensionGraphViewContributionSet } from '@codegraphy-dev/extension-plugin-api';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';

function createEmptyContributions(): ExtensionGraphViewContributionSet {
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
    const graphViewContributions: ExtensionGraphViewContributionSet = {
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
      nodeSizeMode: 'connections',
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
    const graphViewContributions: ExtensionGraphViewContributionSet = {
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
      nodeSizeMode: 'connections',
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
    const graphViewContributions: ExtensionGraphViewContributionSet = {
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
      nodeSizeMode: 'connections',
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

  it('continues creating runtime nodes when an earlier plugin contribution throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const graphViewContributions: ExtensionGraphViewContributionSet = {
      ...createEmptyContributions(),
      runtimeNodes: [
        {
          pluginId: 'broken.plugin',
          contribution: {
            id: 'broken-nodes',
            label: 'Broken nodes',
            createNodes() {
              throw new Error('node creation failed');
            },
          },
        },
        {
          pluginId: 'healthy.plugin',
          contribution: {
            id: 'healthy-nodes',
            label: 'Healthy nodes',
            createNodes: () => [{
              id: 'runtime:healthy',
              label: 'Healthy',
              color: '#84cc16',
            }],
          },
        },
      ],
    };

    const graphData = buildGraphData({
      data: { nodes: [], edges: [] },
      graphViewContributions,
      nodeSizeMode: 'connections',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
    });

    expect(graphData.nodes.map(node => node.id)).toEqual(['runtime:healthy']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Runtime node contribution 'broken-nodes' from plugin 'broken.plugin' failed"),
      expect.any(Error),
    );
  });

  it('continues creating runtime edges when an earlier plugin contribution throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const graphViewContributions: ExtensionGraphViewContributionSet = {
      ...createEmptyContributions(),
      runtimeEdges: [
        {
          pluginId: 'broken.plugin',
          contribution: {
            id: 'broken-edges',
            label: 'Broken edges',
            createEdges() {
              throw new Error('edge creation failed');
            },
          },
        },
        {
          pluginId: 'healthy.plugin',
          contribution: {
            id: 'healthy-edges',
            label: 'Healthy edges',
            createEdges: () => [{
              id: 'src/a.ts->src/b.ts#runtime',
              from: 'src/a.ts',
              to: 'src/b.ts',
              kind: 'healthy.plugin:runtime',
              sources: [],
            }],
          },
        },
      ],
    };

    const graphData = buildGraphData({
      data: {
        nodes: [
          { id: 'src/a.ts', label: 'a.ts', color: '#60a5fa' },
          { id: 'src/b.ts', label: 'b.ts', color: '#60a5fa' },
        ],
        edges: [],
      },
      graphViewContributions,
      nodeSizeMode: 'connections',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
    });

    expect(graphData.links.map(link => link.id)).toEqual(['src/a.ts->src/b.ts#runtime']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Runtime edge contribution 'broken-edges' from plugin 'broken.plugin' failed"),
      expect.any(Error),
    );
  });

  it('continues projecting the graph when an earlier plugin contribution throws', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const healthyProjection = vi.fn(({ visibleGraph }: { visibleGraph: IGraphData }) => visibleGraph);
    const graphViewContributions: ExtensionGraphViewContributionSet = {
      ...createEmptyContributions(),
      projections: [
        {
          pluginId: 'broken.plugin',
          contribution: {
            id: 'broken-projection',
            label: 'Broken projection',
            project() {
              throw new Error('projection failed');
            },
          },
        },
        {
          pluginId: 'healthy.plugin',
          contribution: {
            id: 'healthy-projection',
            label: 'Healthy projection',
            project: healthyProjection,
          },
        },
      ],
    };
    const data: IGraphData = {
      nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#60a5fa' }],
      edges: [],
    };

    const graphData = buildGraphData({
      data,
      graphViewContributions,
      nodeSizeMode: 'connections',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
    });

    expect(graphData.nodes.map(node => node.id)).toEqual(['src/a.ts']);
    expect(healthyProjection).toHaveBeenCalledWith({ visibleGraph: data });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("Projection contribution 'broken-projection' from plugin 'broken.plugin' failed"),
      expect.any(Error),
    );
  });
});
