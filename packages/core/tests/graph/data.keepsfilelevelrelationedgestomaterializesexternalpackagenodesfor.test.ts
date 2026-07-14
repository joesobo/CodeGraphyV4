import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';
import type { IProjectedConnection } from '../../src/analysis/projectedConnection';
import { DEFAULT_NODE_COLOR } from '../../src/fileColors';
import {
  buildWorkspaceGraphData,
  buildWorkspaceGraphDataFromAnalysis,
} from '../../src/graph/data';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^3.0.0',
    supportedExtensions: ['.ts'],
    sources: [
      { id: 'es6-import', name: 'ES6 import', description: 'ES module import' },
      { id: 'dynamic-import', name: 'Dynamic import', description: 'Dynamic import()' },
    ],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

describe('core/graph/data', () => {


    it('uses symbol edges instead of duplicate file-level edges for symbol endpoint relations', () => {
      const graph = buildWorkspaceGraphDataFromAnalysis({
        cacheFiles: {
          'src/source.ts': { size: 10 },
          'src/target.ts': { size: 20 },
        },
        disabledPlugins: new Set(),
        fileAnalysis: new Map([
          ['src/source.ts', {
            filePath: '/workspace/src/source.ts',
            symbols: [{
              id: 'source-symbol',
              filePath: '/workspace/src/source.ts',
              kind: 'function',
              name: 'source',
            }],
            relations: [
              {
                kind: 'import',
                pluginId: 'plugin.symbols',
                sourceId: 'es6-import',
                fromFilePath: '/workspace/src/source.ts',
                toFilePath: '/workspace/src/target.ts',
              },
              {
                kind: 'reference',
                sourceId: 'reference',
                fromFilePath: '/workspace/src/source.ts',
                fromSymbolId: 'source-symbol',
                toFilePath: '/workspace/src/target.ts',
              },
            ],
          }],
          ['src/target.ts', {
            filePath: '/workspace/src/target.ts',
            relations: [],
          }],
        ]),
        showOrphans: true,
        nodeVisibility: { symbol: true, 'symbol:function': true },
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('plugin.symbols'),
      });

      const fileLevelEdges = graph.edges.filter((edge) => edge.from === 'src/source.ts' && edge.to === 'src/target.ts');
      expect(fileLevelEdges).toEqual([
        expect.objectContaining({
          kind: 'import',
          sources: [
            expect.objectContaining({
              label: 'ES6 import',
              sourceId: 'es6-import',
            }),
          ],
        }),
      ]);
      expect(graph.edges).toEqual(expect.arrayContaining([
        {
          id: 'src/source.ts#source:function->src/target.ts#reference',
          from: 'src/source.ts#source:function',
          to: 'src/target.ts',
          kind: 'reference',
          sources: [],
        },
      ]));
    });



    it('builds connected nodes and edges with cached file sizes', () => {
      const typescriptPlugin = createPlugin('plugin.typescript');
      const fileConnections = new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' }]],
        ['src/utils.ts', []],
      ]);

      const graph = buildWorkspaceGraphData({
        cacheFiles: {
          'src/index.ts': { size: 10 },
          'src/utils.ts': { size: 20 },
        },
        disabledPlugins: new Set(),
        fileConnections,
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => typescriptPlugin,
      });

      expect(graph.nodes).toEqual([
        {
          id: 'src/index.ts',
          label: 'index.ts',
          color: DEFAULT_NODE_COLOR,
          fileSize: 10,
        },
        {
          id: 'src/utils.ts',
          label: 'utils.ts',
          color: DEFAULT_NODE_COLOR,
          fileSize: 20,
        },
      ]);
      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: 'plugin.typescript:es6-import',
              pluginId: 'plugin.typescript',
              sourceId: 'es6-import',
              label: 'ES6 import',
            },
          ],
        },
      ]);
    });



    it('filters disabled plugins but keeps source-level provenance', () => {
      const typescriptPlugin = createPlugin('plugin.typescript');
      const pythonPlugin = createPlugin('plugin.python');
      const fileConnections = new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' },
          { specifier: './lazy', resolvedPath: '/workspace/src/lazy.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
        ]],
        ['src/utils.ts', []],
        ['src/lazy.ts', []],
        ['main.py', [{ specifier: 'config', resolvedPath: '/workspace/config.py', kind: 'import', pluginId: 'plugin.python', sourceId: 'import-module' }]],
        ['config.py', []],
      ]);

      const graph = buildWorkspaceGraphData({
        cacheFiles: {},
        disabledPlugins: new Set(['plugin.python']),
        fileConnections,
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: (absolutePath) => {
          if (absolutePath.endsWith('.py')) {
            return pythonPlugin;
          }
          return typescriptPlugin;
        },
      });

      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: 'plugin.typescript:es6-import',
              pluginId: 'plugin.typescript',
              sourceId: 'es6-import',
              label: 'ES6 import',
            },
          ],
        },
        {
          id: 'src/index.ts->src/lazy.ts#import',
          from: 'src/index.ts',
          to: 'src/lazy.ts',
          kind: 'import',
          sources: [
            {
              id: 'plugin.typescript:dynamic-import',
              pluginId: 'plugin.typescript',
              sourceId: 'dynamic-import',
              label: 'Dynamic import',
            },
          ],
        },
      ]);
    });



    it('deduplicates repeated same-kind edges and accumulates distinct sources', () => {
      const typescriptPlugin = createPlugin('plugin.typescript');
      const fileConnections = new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
        ]],
        ['src/utils.ts', []],
      ]);

      const graph = buildWorkspaceGraphData({
        cacheFiles: {},
        disabledPlugins: new Set(),
        fileConnections,
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => typescriptPlugin,
      });

      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: 'plugin.typescript:es6-import',
              pluginId: 'plugin.typescript',
              sourceId: 'es6-import',
              label: 'ES6 import',
            },
            {
              id: 'plugin.typescript:dynamic-import',
              pluginId: 'plugin.typescript',
              sourceId: 'dynamic-import',
              label: 'Dynamic import',
            },
          ],
        },
      ]);
    });



    it('hides orphan nodes and removes edges to missing targets', () => {
      const typescriptPlugin = createPlugin('plugin.typescript');
      const fileConnections = new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' },
          { specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' },
        ]],
        ['src/utils.ts', []],
        ['src/orphan.ts', []],
      ]);

      const graph = buildWorkspaceGraphData({
        cacheFiles: {},
        disabledPlugins: new Set(),
        fileConnections,
        showOrphans: false,
        workspaceRoot: '/workspace',
        getPluginForFile: () => typescriptPlugin,
      });

      expect(graph.nodes.map((node) => node.id)).toEqual(['src/index.ts', 'src/utils.ts']);
      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: 'plugin.typescript:es6-import',
              pluginId: 'plugin.typescript',
              sourceId: 'es6-import',
              label: 'ES6 import',
            },
          ],
        },
      ]);
    });



    it('returns no edges when connections have no resolved path', () => {
      const graph = buildWorkspaceGraphData({
        cacheFiles: {},
        disabledPlugins: new Set(),
        fileConnections: new Map<string, IProjectedConnection[]>([
          ['src/index.ts', [{ specifier: './utils', resolvedPath: null, kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' }]],
          ['src/utils.ts', []],
        ]),
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('plugin.typescript'),
      });

      expect(graph.edges).toEqual([]);
    });



    it('materializes external package nodes for unresolved TypeScript imports', () => {
      const graph = buildWorkspaceGraphData({
        cacheFiles: {
          'src/index.ts': { size: 10 },
        },
        disabledPlugins: new Set(),
        fileConnections: new Map<string, IProjectedConnection[]>([
          ['src/index.ts', [
            { specifier: 'node:fs/promises', resolvedPath: null, kind: 'import', pluginId: 'codegraphy.typescript', sourceId: 'es6-import' },
          ]],
        ]),
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('codegraphy.typescript'),
      });

      expect(graph.nodes).toEqual([
        {
          id: 'src/index.ts',
          label: 'index.ts',
          color: DEFAULT_NODE_COLOR,
          fileSize: 10,
        },
        {
          id: 'pkg:fs',
          label: 'fs',
          color: '#F59E0B',
          nodeType: 'package',
          shape2D: 'hexagon',
        },
      ]);
      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->pkg:fs#import',
          from: 'src/index.ts',
          to: 'pkg:fs',
          kind: 'import',
          sources: [
            {
              id: 'codegraphy.typescript:es6-import',
              pluginId: 'codegraphy.typescript',
              sourceId: 'es6-import',
              label: 'ES6 import',
            },
          ],
        },
      ]);
    });
});
