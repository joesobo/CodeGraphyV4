import { describe, expect, it } from 'vitest';
import type { IGraphData,IGraphEdge,IGraphNode } from '../../../src/shared/graph/contracts';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../src/shared/graphControls/packages/workspace';
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



    it('keeps generic symbol groups hidden while showing enabled symbol-kind children', () => {
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
              ...node('src/app.ts#unknown:macro', 'symbol'),
              symbol: {
                id: 'src/app.ts#unknown:macro',
                name: 'unknown',
                kind: 'macro',
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
            edge('src/app.ts', 'src/app.ts#unknown:macro', 'contains'),
            edge('src/app.ts', 'src/app.ts#VERSION:constant', 'contains'),
          ],
        },
        {
          scope: {
            nodes: [
              { type: 'file', enabled: true },
              { type: 'symbol', enabled: false },
              { type: 'symbol:function', enabled: true },
              { type: 'variable', enabled: false },
              { type: 'symbol:constant', enabled: true },
            ],
            edges: [{ type: 'contains', enabled: true }],
          },
        },
      );

      expect(ids(result.graphData)).toEqual({
        nodes: [
          'src/app.ts',
          'src/app.ts#build:function',
          'src/app.ts#VERSION:constant',
        ],
        edges: [
          'src/app.ts->src/app.ts#build:function#contains',
          'src/app.ts->src/app.ts#VERSION:constant#contains',
        ],
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



    it('shows enabled plugin-specific variable children when Variables is disabled', () => {
      const result = deriveVisibleGraph(
        {
          nodes: [
            node('scripts/player.gd'),
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
            edge('scripts/player.gd', 'scripts/player.gd#Player:godot-class-name', 'contains'),
          ],
        },
        {
          scope: {
            nodes: [
              { type: 'file', enabled: true },
              { type: 'symbol', enabled: true },
              { type: 'variable', enabled: false },
              { type: 'plugin:codegraphy.gdscript:symbol:godot-class-name', enabled: true },
            ],
            edges: [{ type: 'contains', enabled: true }],
          },
        },
      );

      expect(ids(result.graphData)).toEqual({
        nodes: [
          'scripts/player.gd',
          'scripts/player.gd#Player:godot-class-name',
        ],
        edges: [
          'scripts/player.gd->scripts/player.gd#Player:godot-class-name#contains',
        ],
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
});
