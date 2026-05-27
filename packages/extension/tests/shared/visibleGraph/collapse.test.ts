import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/shared/graph/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND, deriveVisibleGraph } from '../../../src/shared/visibleGraph';
import { applyCollapseProjection } from '../../../src/shared/visibleGraph/collapse';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id.split('/').pop() ?? id,
    color: '#111111',
    nodeType,
  };
}

function edge(
  from: string,
  to: string,
  kind: IGraphEdge['kind'] = 'import',
  sources: IGraphEdge['sources'] = [],
): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources,
  };
}

function folderScope() {
  return {
    nodes: [
      { type: 'file', enabled: true },
      { type: 'folder', enabled: true },
    ],
    edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
  };
}

describe('shared/visibleGraph/collapse', () => {
  it('annotates collapsible folders when no folders are collapsed', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src', 'folder'),
        node('src/app.ts'),
        node('outside.ts'),
      ],
      edges: [edge('src/app.ts', 'outside.ts')],
    };

    const result = applyCollapseProjection(graphData);

    expect(result.nodes.find((item) => item.id === 'src')).toMatchObject({
      isCollapsible: true,
      isCollapsed: false,
    });
    expect(result.edges).toBe(graphData.edges);
  });

  it('keeps a collapsed folder visible and recursively hides its current descendants', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
        node('src/features/button.ts'),
        node('src/features/panel.ts'),
      ],
      edges: [edge('src/app.ts', 'src/features/button.ts')],
    };

    const result = deriveVisibleGraph(graphData, {
      collapse: { collapsedNodeIds: ['src'] },
      scope: folderScope(),
    }).graphData;

    expect(result.nodes.map((item) => item.id)).toEqual(['src']);
    expect(result.nodes[0]).toMatchObject({
      id: 'src',
      isCollapsed: true,
      collapsedDescendantCount: 4,
    });
    expect(result.edges).toEqual([]);
  });

  it('projects cross-boundary edges through the collapsed folder while preserving direction', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src', 'folder'),
        node('src/app.ts'),
        node('src/button.ts'),
        node('lib/util.ts'),
      ],
      edges: [
        edge('src/app.ts', 'lib/util.ts', 'reference'),
        edge('lib/util.ts', 'src/button.ts', 'import'),
      ],
    };

    const result = deriveVisibleGraph(graphData, {
      collapse: { collapsedNodeIds: ['src'] },
    }).graphData;

    expect(result.nodes.map((item) => item.id)).toEqual(['src', 'lib/util.ts']);
    expect(result.edges.map((item) => `${item.from}->${item.to}#${item.kind}`)).toEqual([
      'src->lib/util.ts#reference',
      'lib/util.ts->src#import',
    ]);
  });

  it('merges projected edge sources when multiple hidden descendants connect to the same visible target', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src', 'folder'),
        node('src/app.ts'),
        node('src/button.ts'),
        node('lib/util.ts'),
      ],
      edges: [
        edge('src/app.ts', 'lib/util.ts', 'import', [
          { id: 'plugin:app', pluginId: 'plugin', sourceId: 'app', label: 'App import' },
        ]),
        edge('src/button.ts', 'lib/util.ts', 'import', [
          { id: 'plugin:button', pluginId: 'plugin', sourceId: 'button', label: 'Button import' },
          { id: 'plugin:app', pluginId: 'plugin', sourceId: 'app', label: 'App import' },
        ]),
      ],
    };

    const result = deriveVisibleGraph(graphData, {
      collapse: { collapsedNodeIds: ['src'] },
    }).graphData;

    expect(result.edges).toEqual([
      expect.objectContaining({
        id: 'src->lib/util.ts#import',
        from: 'src',
        to: 'lib/util.ts',
        sources: [
          { id: 'plugin:app', pluginId: 'plugin', sourceId: 'app', label: 'App import' },
          { id: 'plugin:button', pluginId: 'plugin', sourceId: 'button', label: 'Button import' },
        ],
      }),
    ]);
  });

  it('keeps nested collapse state independent of the parent folder collapse state', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src', 'folder'),
        node('src/components', 'folder'),
        node('src/components/Button.ts'),
        node('outside.ts'),
      ],
      edges: [edge('outside.ts', 'src/components/Button.ts')],
    };

    const parentCollapsed = deriveVisibleGraph(graphData, {
      collapse: { collapsedNodeIds: ['src', 'src/components'] },
    }).graphData;
    expect(parentCollapsed.nodes.map((item) => item.id)).toEqual(['src', 'outside.ts']);
    expect(parentCollapsed.nodes[0]).toMatchObject({
      id: 'src',
      isCollapsed: true,
      collapsedDescendantCount: 2,
    });
    expect(parentCollapsed.edges.map((item) => `${item.from}->${item.to}#${item.kind}`)).toEqual([
      'outside.ts->src#import',
    ]);

    const childStillCollapsed = deriveVisibleGraph(graphData, {
      collapse: { collapsedNodeIds: ['src/components'] },
    }).graphData;
    expect(childStillCollapsed.nodes.map((item) => item.id)).toEqual([
      'src',
      'src/components',
      'outside.ts',
    ]);
    expect(childStillCollapsed.nodes.find((item) => item.id === 'src/components')).toMatchObject({
      id: 'src/components',
      isCollapsed: true,
      collapsedDescendantCount: 1,
    });
    expect(childStillCollapsed.edges.map((item) => `${item.from}->${item.to}#${item.kind}`)).toEqual([
      'outside.ts->src/components#import',
    ]);
  });

  it('keeps collapsed folders visible when show-orphans is disabled', () => {
    const graphData: IGraphData = {
      nodes: [
        node('src/app.ts'),
        node('src/lib.ts'),
      ],
      edges: [edge('src/app.ts', 'src/lib.ts')],
    };

    const result = deriveVisibleGraph(graphData, {
      collapse: { collapsedNodeIds: ['src'] },
      scope: folderScope(),
      showOrphans: false,
    }).graphData;

    expect(result.nodes.map((item) => item.id)).toEqual(['src']);
  });
});
