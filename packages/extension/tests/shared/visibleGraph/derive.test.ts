import { describe, expect, it } from 'vitest';
import type { IGraphData, IGraphEdge, IGraphNode } from '../../../src/shared/graph/contracts';
import {
  deriveVisibleGraph,
  STRUCTURAL_NESTS_EDGE_KIND,
} from '../../../src/shared/visibleGraph';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../src/shared/graphControls/packages/workspace';

function node(id: string, nodeType = 'file'): IGraphNode {
  return {
    id,
    label: id.split('/').pop() ?? id,
    color: '#111111',
    nodeType,
  };
}

function edge(from: string, to: string, kind: IGraphEdge['kind']): IGraphEdge {
  return {
    id: `${from}->${to}#${kind}`,
    from,
    to,
    kind,
    sources: [],
  };
}

function ids(graphData: IGraphData): { nodes: string[]; edges: string[] } {
  return {
    nodes: graphData.nodes.map((item) => item.id),
    edges: graphData.edges.map((item) => item.id),
  };
}

describe('shared/visibleGraph/deriveVisibleGraph', () => {
  it('applies graph scope before filter patterns', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/app.ts'),
          node('src/plugin-route', 'plugin-route'),
          node('README.md'),
        ],
        edges: [
          edge('src/plugin-route', 'src/app.ts', 'reference'),
          edge('src/app.ts', 'README.md', 'import'),
        ],
      },
      {
        scope: {
          nodes: [{ type: 'plugin-route', enabled: false }],
          edges: [{ type: 'reference', enabled: true }],
        },
        filter: { patterns: ['README.md'] },
      },
    );

    expect(ids(result.graphData)).toEqual({
      nodes: ['src/app.ts'],
      edges: [],
    });
    expect(result.regexError).toBeNull();
  });

  it('projects visible folder and workspace package structure with core nests edges', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('package.json'),
          node('packages/extension/package.json'),
          node('packages/extension/src/index.ts'),
        ],
        edges: [],
      },
      {
        scope: {
          nodes: [
            { type: 'file', enabled: true },
            { type: 'folder', enabled: true },
            { type: 'package', enabled: true },
          ],
          edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
        },
      },
    );

    expect(result.graphData.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'packages/extension/src', nodeType: 'folder' }),
        expect.objectContaining({
          id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
          nodeType: 'package',
        }),
      ]),
    );
    expect(result.graphData.edges).toEqual(
      expect.arrayContaining([
        {
          id: 'packages/extension->packages/extension/src#nests',
          from: 'packages/extension',
          to: 'packages/extension/src',
          kind: STRUCTURAL_NESTS_EDGE_KIND,
          sources: [],
        },
        {
          id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/src/index.ts#nests`,
          from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
          to: 'packages/extension/src/index.ts',
          kind: STRUCTURAL_NESTS_EDGE_KIND,
          sources: [],
        },
      ]),
    );
    expect(result.graphData.edges.every((item) => !item.id.includes('codegraphy:nests'))).toBe(true);
  });

  it('can project folder structure when file nodes are hidden by scope', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/lib/a.ts'),
        ],
        edges: [],
      },
      {
        scope: {
          nodes: [
            { type: 'file', enabled: false },
            { type: 'folder', enabled: true },
          ],
          edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
        },
      },
    );

    expect(ids(result.graphData)).toEqual({
      nodes: ['src', 'src/lib'],
      edges: ['src->src/lib#nests'],
    });
  });

  it('runs search after filter patterns', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/visible.ts'),
          { ...node('src/generated.target.ts'), label: 'Target' },
        ],
        edges: [edge('src/visible.ts', 'src/generated.target.ts', 'import')],
      },
      {
        filter: { patterns: ['*.target.ts'] },
        search: { query: 'Target' },
      },
    );

    expect(ids(result.graphData)).toEqual({ nodes: [], edges: [] });
    expect(result.regexError).toBeNull();
  });

  it('applies show orphans after search', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          { ...node('src/a.ts'), label: 'Only Match' },
          node('src/b.ts'),
        ],
        edges: [edge('src/a.ts', 'src/b.ts', 'import')],
      },
      {
        search: { query: 'Only Match' },
        showOrphans: false,
      },
    );

    expect(ids(result.graphData)).toEqual({ nodes: [], edges: [] });
  });

  it('runs show orphans after structural projection', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/a.ts'),
          node('README.md'),
        ],
        edges: [],
      },
      {
        scope: {
          nodes: [
            { type: 'file', enabled: true },
            { type: 'folder', enabled: true },
          ],
          edges: [{ type: STRUCTURAL_NESTS_EDGE_KIND, enabled: true }],
        },
        showOrphans: false,
      },
    );

    expect(ids(result.graphData)).toEqual({
      nodes: ['src/a.ts', 'README.md', 'src', '(root)'],
      edges: ['(root)->src#nests', 'src->src/a.ts#nests', '(root)->README.md#nests'],
    });
  });

  it('returns regex errors from search without throwing', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/a.ts'),
          node('src/b.ts'),
        ],
        edges: [edge('src/a.ts', 'src/b.ts', 'import')],
      },
      {
        search: {
          query: '[',
          options: { regex: true },
        },
      },
    );

    expect(result.graphData).toEqual({ nodes: [], edges: [] });
    expect(result.regexError).toMatch(/Invalid regular expression/);
  });
});
