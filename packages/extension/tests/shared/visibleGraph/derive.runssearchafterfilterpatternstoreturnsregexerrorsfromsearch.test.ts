import { describe, expect, it } from 'vitest';
import type { IGraphData,IGraphEdge,IGraphNode } from '../../../src/shared/graph/contracts';
import {
  deriveVisibleGraph,
  STRUCTURAL_NESTS_EDGE_KIND,
} from '../../../src/shared/visibleGraph';

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



    it('hides symbols when their containing file is filtered out', () => {
      const result = deriveVisibleGraph(
        {
          nodes: [
            node('src/player.gd'),
            {
              ...node('src/player.gd#_ready:method', 'symbol'),
              symbol: {
                id: 'src/player.gd#_ready:method',
                name: '_ready',
                kind: 'method',
                filePath: 'src/player.gd',
              },
            },
          ],
          edges: [edge('src/player.gd', 'src/player.gd#_ready:method', 'contains')],
        },
        {
          scope: {
            nodes: [
              { type: 'file', enabled: true },
              { type: 'symbol', enabled: true },
            ],
            edges: [{ type: 'contains', enabled: true }],
          },
          filter: { patterns: ['src/player.gd'] },
        },
      );

      expect(ids(result.graphData)).toEqual({
        nodes: [],
        edges: [],
      });
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



    it('connects discovered empty folder nodes through structural projection', () => {
      const result = deriveVisibleGraph(
        {
          nodes: [
            node('src/app.ts'),
            node('src/new-folder', 'folder'),
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
        },
      );

      expect(ids(result.graphData)).toEqual({
        nodes: ['src/app.ts', 'src/new-folder', 'src'],
        edges: ['src->src/new-folder#nests', 'src->src/app.ts#nests'],
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
