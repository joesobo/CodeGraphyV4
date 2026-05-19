import { describe, expect, it } from 'vitest';
import {
  createOrganizeGraphViewContributions,
  hasOrganizeGraphSectionContributions,
} from '../../../../src/webview/components/graph/organize/contributions';
import { buildGraphData } from '../../../../src/webview/components/graph/model/build';
import type { IGraphViewContributionStatus } from '../../../../src/shared/protocol/extensionToWebview';

const organizeStatuses: IGraphViewContributionStatus[] = [
  {
    kind: 'runtimeNodes',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.section-nodes',
    label: 'Graph Section Nodes',
  },
  {
    kind: 'runtimeEdges',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.section-membership-edges',
    label: 'Graph Section Membership Edges',
  },
  {
    kind: 'projections',
    pluginId: 'codegraphy.organize',
    contributionId: 'codegraphy.organize.graph-section-projection',
    label: 'Graph Section Projection',
  },
];

function createGraphLayout() {
  return {
    collapsedNodes: {},
    pinnedNodes: {},
    sections: {
      'section-ui': {
        id: 'section-ui',
        label: 'UI',
        color: '#60a5fa',
        x: 0,
        y: 0,
        width: 300,
        height: 180,
        collapsed: true,
        updatedAt: '2026-05-19T01:00:00.000Z',
      },
    },
    ownership: {
      'section-ui': {
        itemId: 'section-ui',
        itemKind: 'section' as const,
        ownerSectionId: null,
        updatedAt: '2026-05-19T01:00:00.000Z',
      },
      'src/app.ts': {
        itemId: 'src/app.ts',
        itemKind: 'node' as const,
        ownerSectionId: 'section-ui',
        updatedAt: '2026-05-19T01:00:00.000Z',
      },
      'src/button.ts': {
        itemId: 'src/button.ts',
        itemKind: 'node' as const,
        ownerSectionId: 'section-ui',
        updatedAt: '2026-05-19T01:00:00.000Z',
      },
    },
  };
}

describe('graph/organize/contributions', () => {
  it('requires Organize section node and projection contribution statuses', () => {
    expect(hasOrganizeGraphSectionContributions([])).toBe(false);
    expect(hasOrganizeGraphSectionContributions([organizeStatuses[0]!])).toBe(false);
    expect(hasOrganizeGraphSectionContributions(organizeStatuses)).toBe(true);
  });

  it('builds runtime Graph Section nodes and collapsed projections from available Organize statuses', () => {
    const graphLayout = createGraphLayout();
    const graphViewContributions = createOrganizeGraphViewContributions({
      graphLayout,
      statuses: organizeStatuses,
    });

    const graphData = buildGraphData({
      data: {
        nodes: [
          { id: 'outside.ts', label: 'outside.ts', color: '#93c5fd' },
          { id: 'src/app.ts', label: 'app.ts', color: '#93c5fd' },
          { id: 'src/button.ts', label: 'button.ts', color: '#93c5fd' },
        ],
        edges: [
          { id: 'outside.ts->src/app.ts#import', from: 'outside.ts', to: 'src/app.ts', kind: 'import', sources: [] },
          { id: 'outside.ts->src/button.ts#import', from: 'outside.ts', to: 'src/button.ts', kind: 'import', sources: [] },
        ],
      },
      graphLayout,
      graphViewContributions,
      graphMode: '2d',
      nodeSizeMode: 'uniform',
      theme: 'dark',
      favorites: new Set(),
      bidirectionalMode: 'separate',
      timelineActive: false,
    });

    expect(graphData.nodes.map(node => node.id).sort()).toEqual(['outside.ts', 'section-ui']);
    expect(graphData.nodes.find(node => node.id === 'section-ui')).toMatchObject({
      isCollapsedGraphSection: true,
      isGraphSection: true,
      hiddenDescendantCount: 2,
      nodeType: 'graph-section',
      runtimeNodeType: 'codegraphy.organize.graph-section',
      size: 24,
    });
    expect(graphData.links).toEqual([
      expect.objectContaining({
        from: 'outside.ts',
        projectedEdgeCount: 2,
        projectedEdgeIds: [
          'outside.ts->src/app.ts#import',
          'outside.ts->src/button.ts#import',
        ],
        to: 'section-ui',
      }),
    ]);
  });

  it('does not create Organize Graph Section nodes in 3D or timeline views', () => {
    const graphLayout = createGraphLayout();
    const graphViewContributions = createOrganizeGraphViewContributions({
      graphLayout,
      statuses: organizeStatuses,
    });
    const data = {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', color: '#93c5fd' },
        { id: 'src/button.ts', label: 'button.ts', color: '#93c5fd' },
      ],
      edges: [],
    };
    const sharedOptions = {
      data,
      graphLayout,
      graphViewContributions,
      nodeSizeMode: 'uniform' as const,
      theme: 'dark' as const,
      favorites: new Set<string>(),
      bidirectionalMode: 'separate' as const,
    };

    expect(buildGraphData({
      ...sharedOptions,
      graphMode: '3d',
      timelineActive: false,
    }).nodes.map(node => node.id)).toEqual(['src/app.ts', 'src/button.ts']);
    expect(buildGraphData({
      ...sharedOptions,
      graphMode: '2d',
      timelineActive: true,
    }).nodes.map(node => node.id)).toEqual(['src/app.ts', 'src/button.ts']);
  });

  it('does not expose Organize Graph View behavior without the contribution statuses', () => {
    expect(createOrganizeGraphViewContributions({
      graphLayout: createGraphLayout(),
      statuses: [],
    })).toBeUndefined();
  });
});
