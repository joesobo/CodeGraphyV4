import type { IPlugin } from '@codegraphy-dev/plugin-api';
import { describe, expect, it, vi } from 'vitest';
import type { IProjectedConnection } from '../../src/analysis/projectedConnection';
import { DEFAULT_FOLDER_NODE_COLOR, DEFAULT_NODE_COLOR } from '../../src/fileColors';
import {
  buildWorkspaceGraphData
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


    it('returns no edges when resolved targets are not discovered files', () => {
      const graph = buildWorkspaceGraphData({
        cacheFiles: {},
        disabledPlugins: new Set(),
        fileConnections: new Map<string, IProjectedConnection[]>([
          ['src/index.ts', [{ specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' }]],
        ]),
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('plugin.typescript'),
      });

      expect(graph.edges).toEqual([]);
    });



    it('creates a source list when a later duplicate edge adds another source', () => {
      const graph = buildWorkspaceGraphData({
        cacheFiles: {},
        disabledPlugins: new Set(),
        fileConnections: new Map<string, IProjectedConnection[]>([
          ['src/index.ts', [
            { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'dynamic-import' },
            { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', pluginId: 'plugin.typescript', sourceId: 'es6-import' },
          ]],
          ['src/utils.ts', []],
        ]),
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('plugin.typescript'),
      });

      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [
            {
              id: 'plugin.typescript:dynamic-import',
              pluginId: 'plugin.typescript',
              sourceId: 'dynamic-import',
              label: 'Dynamic import',
            },
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



    it('materializes discovered directories that have no file node descendants as folder nodes', () => {
      const graph = buildWorkspaceGraphData({
        cacheFiles: {
          'src/app.ts': { size: 10 },
        },
        directoryPaths: ['src', 'src/new-folder'],
        disabledPlugins: new Set(),
        fileConnections: new Map<string, IProjectedConnection[]>([
          ['src/app.ts', []],
        ]),
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => createPlugin('plugin.typescript'),
      });

      expect(graph.nodes).toEqual([
        {
          id: 'src/app.ts',
          label: 'app.ts',
          color: DEFAULT_NODE_COLOR,
          fileSize: 10,
        },
        {
          id: 'src/new-folder',
          label: 'new-folder',
          color: DEFAULT_FOLDER_NODE_COLOR,
          nodeType: 'folder',
        },
      ]);
    });



    it('omits source provenance when no plugin matches the source file', () => {
      const graph = buildWorkspaceGraphData({
        cacheFiles: {},
        disabledPlugins: new Set(),
        fileConnections: new Map<string, IProjectedConnection[]>([
          ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' }]],
          ['src/utils.ts', []],
        ]),
        showOrphans: true,
        workspaceRoot: '/workspace',
        getPluginForFile: () => undefined,
      });

      expect(graph.edges).toEqual([
        {
          id: 'src/index.ts->src/utils.ts#import',
          from: 'src/index.ts',
          to: 'src/utils.ts',
          kind: 'import',
          sources: [],
        },
      ]);
    });
});
