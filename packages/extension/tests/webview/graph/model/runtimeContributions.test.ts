import { describe, expect, it, vi } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy-dev/core';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';

function createEmptyContributions(): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
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
      timelineActive: false,
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

  it('passes live graph mode and timeline state to runtime contributions', () => {
    const createNodes = vi.fn(() => []);
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
    };

    buildGraphData({
      data: { nodes: [], edges: [] },
      graphViewContributions,
      nodeSizeMode: 'uniform',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
      graphMode: '3d',
      timelineActive: true,
    });

    expect(createNodes).toHaveBeenCalledWith(expect.objectContaining({
      graphMode: '3d',
      timelineActive: true,
    }));
  });
});
