import { describe, expect, it, vi } from 'vitest';
import type { IProjectedConnection, IPlugin } from '../../../../src/core/plugins/types/contracts';
import { DEFAULT_NODE_COLOR } from '../../../../src/shared/fileColors';
import { buildWorkspaceGraphData } from '../../../../src/extension/pipeline/graph/data';

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
      { id: 'reexport', name: 'Re-export', description: 'Export from relation' },
    ],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
  } as IPlugin;
}

describe('pipeline/graph/data', () => {
  it('builds connected nodes and edges with cached size and visit counts', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' }]],
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
      visitCounts: {
        'src/index.ts': 2,
      },
      workspaceRoot: '/workspace',
      getPluginForFile: () => typescriptPlugin,
    });

    expect(graph.nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 10,
        accessCount: 2,
      },
      {
        id: 'src/utils.ts',
        label: 'utils.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 20,
        accessCount: 0,
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
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        { specifier: './lazy', resolvedPath: '/workspace/src/lazy.ts', kind: 'import', sourceId: 'dynamic-import' },
      ]],
      ['src/utils.ts', []],
      ['src/lazy.ts', []],
      ['main.py', [{ specifier: 'config', resolvedPath: '/workspace/config.py', kind: 'import', sourceId: 'import-module' }]],
      ['config.py', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(['plugin.python']),
      fileConnections,
      showOrphans: true,
      visitCounts: {},
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
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'reexport', sourceId: 'reexport' },
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'reexport', sourceId: 'reexport' },
      ]],
      ['src/utils.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections,
      showOrphans: true,
      visitCounts: {},
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
        ],
      },
      {
        id: 'src/index.ts->src/utils.ts#reexport',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        kind: 'reexport',
        sources: [
          {
            id: 'plugin.typescript:reexport',
            pluginId: 'plugin.typescript',
            sourceId: 'reexport',
            label: 'Re-export',
          },
        ],
      },
    ]);
  });

  it('hides orphan nodes and removes edges to missing targets', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        { specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', sourceId: 'es6-import' },
      ]],
      ['src/utils.ts', []],
      ['src/orphan.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections,
      showOrphans: false,
      visitCounts: {},
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
        ['src/index.ts', [{ specifier: './utils', resolvedPath: null, kind: 'import', sourceId: 'es6-import' }]],
        ['src/utils.ts', []],
      ]),
      showOrphans: true,
      visitCounts: {},
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
          { specifier: 'node:fs/promises', resolvedPath: null, kind: 'import', sourceId: 'es6-import' },
        ]],
      ]),
      showOrphans: true,
      visitCounts: {
        'src/index.ts': 2,
      },
      workspaceRoot: '/workspace',
      getPluginForFile: () => createPlugin('codegraphy.typescript'),
    });

    expect(graph.nodes).toEqual([
      {
        id: 'src/index.ts',
        label: 'index.ts',
        color: DEFAULT_NODE_COLOR,
        fileSize: 10,
        accessCount: 2,
      },
      {
        id: 'pkg:fs',
        label: 'fs',
        color: '#F59E0B',
        nodeType: 'package',
        shape2D: 'hexagon',
        shape3D: 'cube',
        fileSize: undefined,
        accessCount: 0,
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

  it('returns no edges when resolved targets are not discovered files', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './missing', resolvedPath: '/workspace/src/missing.ts', kind: 'import', sourceId: 'es6-import' }]],
      ]),
      showOrphans: true,
      visitCounts: {},
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
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'dynamic-import' },
          { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' },
        ]],
        ['src/utils.ts', []],
      ]),
      showOrphans: true,
      visitCounts: {},
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

  it('omits source provenance when no plugin matches the source file', () => {
    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', kind: 'import', sourceId: 'es6-import' }]],
        ['src/utils.ts', []],
      ]),
      showOrphans: true,
      visitCounts: {},
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
