import { describe, expect, it } from 'vitest';
import type { CoreGraphViewContributionSet } from '@codegraphy/core';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';

function createEmptyContributions(): CoreGraphViewContributionSet {
  return {
    runtimeNodes: [],
    runtimeEdges: [],
    projections: [],
    forces: [],
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
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'codegraphy.organize.section-node',
          label: 'Section Node',
          createNodes() {
            return [{
              id: 'section:frontend',
              label: 'Frontend',
              color: '#84cc16',
              nodeType: 'organize:section',
              metadata: { owner: 'design' },
            }];
          },
        },
      }],
      runtimeEdges: [{
        pluginId: 'codegraphy.organize',
        contribution: {
          id: 'codegraphy.organize.section-member-edge',
          label: 'Section Member Edge',
          createEdges() {
            return [{
              id: 'section:frontend->src/App.tsx#organize:member',
              from: 'section:frontend',
              to: 'src/App.tsx',
              kind: 'organize:member',
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

    expect(graphData.nodes.find(node => node.id === 'section:frontend')).toMatchObject({
      id: 'section:frontend',
      label: 'Frontend',
      metadata: { owner: 'design' },
      nodeType: 'organize:section',
    });
    expect(graphData.links).toEqual([
      expect.objectContaining({
        id: 'section:frontend->src/App.tsx#organize:member',
        from: 'section:frontend',
        kind: 'organize:member',
        metadata: { role: 'member' },
        to: 'src/App.tsx',
      }),
    ]);
  });
});
