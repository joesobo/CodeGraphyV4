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

  it('keeps variable nodes hidden unless symbol nodes are enabled', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/app.ts'),
          node('src/app.ts#VERSION:constant', 'variable'),
        ],
        edges: [
          edge('src/app.ts', 'src/app.ts#VERSION:constant', 'contains'),
        ],
      },
      {
        scope: {
          nodes: [
            { type: 'file', enabled: true },
            { type: 'symbol', enabled: false },
            { type: 'variable', enabled: true },
            { type: 'symbol:constant', enabled: true },
          ],
          edges: [{ type: 'contains', enabled: true }],
        },
      },
    );

    expect(ids(result.graphData)).toEqual({
      nodes: ['src/app.ts'],
      edges: [],
    });
  });

  it('applies symbol-kind graph scope after the Symbols parent scope is enabled', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/app.ts'),
          {
            ...node('src/app.ts#build:function', 'symbol'),
            symbol: {
              id: 'src/app.ts#build:function',
              name: 'build',
              kind: 'function',
              filePath: 'src/app.ts',
            },
          },
          {
            ...node('src/app.ts#render:method', 'symbol'),
            symbol: {
              id: 'src/app.ts#render:method',
              name: 'render',
              kind: 'method',
              filePath: 'src/app.ts',
            },
          },
          {
            ...node('src/app.ts#User:type', 'symbol'),
            symbol: {
              id: 'src/app.ts#User:type',
              name: 'User',
              kind: 'type',
              filePath: 'src/app.ts',
            },
          },
          {
            ...node('src/app.ts#VERSION:constant', 'variable'),
            symbol: {
              id: 'src/app.ts#VERSION:constant',
              name: 'VERSION',
              kind: 'constant',
              filePath: 'src/app.ts',
            },
          },
        ],
        edges: [
          edge('src/app.ts', 'src/app.ts#build:function', 'contains'),
          edge('src/app.ts', 'src/app.ts#render:method', 'contains'),
          edge('src/app.ts', 'src/app.ts#User:type', 'contains'),
          edge('src/app.ts', 'src/app.ts#VERSION:constant', 'contains'),
        ],
      },
      {
        scope: {
          nodes: [
            { type: 'file', enabled: true },
            { type: 'symbol', enabled: true },
            { type: 'variable', enabled: true },
            { type: 'symbol:function', enabled: false },
            { type: 'symbol:type', enabled: true },
            { type: 'symbol:constant', enabled: false },
          ],
          edges: [{ type: 'contains', enabled: true }],
        },
      },
    );

    expect(ids(result.graphData)).toEqual({
      nodes: ['src/app.ts', 'src/app.ts#User:type'],
      edges: ['src/app.ts->src/app.ts#User:type#contains'],
    });
  });

  it('applies plugin-specific symbol graph scope without hiding ordinary classes', () => {
    const result = deriveVisibleGraph(
      {
        nodes: [
          node('src/user.ts'),
          {
            ...node('src/user.ts#User:class', 'symbol'),
            symbol: {
              id: 'src/user.ts#User:class',
              name: 'User',
              kind: 'class',
              filePath: 'src/user.ts',
            },
          },
          {
            ...node('scripts/player.gd#Player:godot-class-name', 'symbol'),
            symbol: {
              id: 'scripts/player.gd#Player:godot-class-name',
              name: 'Player',
              kind: 'class',
              filePath: 'scripts/player.gd',
              pluginKind: 'godot-class-name',
              source: 'codegraphy.gdscript',
              language: 'gdscript',
            },
          },
        ],
        edges: [
          edge('src/user.ts', 'src/user.ts#User:class', 'contains'),
          edge('src/user.ts', 'scripts/player.gd#Player:godot-class-name', 'reference'),
        ],
      },
      {
        scope: {
          nodes: [
            { type: 'file', enabled: true },
            { type: 'symbol', enabled: true },
            { type: 'symbol:class', enabled: true },
            { type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: false },
          ],
          edges: [
            { type: 'contains', enabled: true },
            { type: 'reference', enabled: true },
          ],
        },
      },
    );

    expect(ids(result.graphData)).toEqual({
      nodes: ['src/user.ts', 'src/user.ts#User:class'],
      edges: ['src/user.ts->src/user.ts#User:class#contains'],
    });
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
