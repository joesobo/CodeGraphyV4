import { describe, expect, it } from 'vitest';
import type { IProjectedConnection } from '../../../../src/analysis/projectedConnection';
import { DEFAULT_NODE_COLOR } from '../../../../src/fileColors';
import { buildWorkspaceGraphData } from '../../../../src/graph/data';
import { createPlugin } from '../fixture';

describe('core/graph/data file relationships', () => {
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

});
