import { describe, expect, it, vi } from 'vitest';
import type { IConnection, IPlugin } from '../../src/core/plugins';
import { DEFAULT_NODE_COLOR } from '../../src/shared/types';
import { buildWorkspaceGraphData } from '../../src/extension/workspaceGraphData';

function createPlugin(id: string): IPlugin {
  return {
    id,
    name: id,
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    detectConnections: vi.fn(async () => []),
  };
}

describe('workspaceGraphData', () => {
  it('builds connected nodes and edges with cached size and visit counts', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IConnection[]>([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'es6-import' }]],
      ['src/utils.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {
        'src/index.ts': { size: 10 },
        'src/utils.ts': { size: 20 },
      },
      disabledPlugins: new Set(),
      disabledRules: new Set(),
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
        id: 'src/index.ts->src/utils.ts',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        ruleIds: ['plugin.typescript:es6-import'],
      },
    ]);
  });

  it('filters disabled plugins and rules', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const pythonPlugin = createPlugin('plugin.python');
    const fileConnections = new Map<string, IConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'es6-import' },
        { specifier: './lazy', resolvedPath: '/workspace/src/lazy.ts', type: 'dynamic', ruleId: 'dynamic-import' },
      ]],
      ['src/utils.ts', []],
      ['src/lazy.ts', []],
      ['main.py', [{ specifier: 'config', resolvedPath: '/workspace/config.py', type: 'static', ruleId: 'import-module' }]],
      ['config.py', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(['plugin.python']),
      disabledRules: new Set(['plugin.typescript:dynamic-import']),
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
        id: 'src/index.ts->src/utils.ts',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        ruleIds: ['plugin.typescript:es6-import'],
      },
    ]);
  });

  it('deduplicates repeated edges and accumulates distinct rule ids', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'es6-import' },
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'reexport', ruleId: 'reexport' },
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'reexport', ruleId: 'reexport' },
      ]],
      ['src/utils.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      disabledRules: new Set(),
      fileConnections,
      showOrphans: true,
      visitCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => typescriptPlugin,
    });

    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts',
        from: 'src/index.ts',
        to: 'src/utils.ts',
        ruleIds: [
          'plugin.typescript:es6-import',
          'plugin.typescript:reexport',
        ],
      },
    ]);
  });

  it('hides orphan nodes and removes edges to missing targets', () => {
    const typescriptPlugin = createPlugin('plugin.typescript');
    const fileConnections = new Map<string, IConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' },
        { specifier: './missing', resolvedPath: '/workspace/src/missing.ts', type: 'static' },
      ]],
      ['src/utils.ts', []],
      ['src/orphan.ts', []],
    ]);

    const graph = buildWorkspaceGraphData({
      cacheFiles: {},
      disabledPlugins: new Set(),
      disabledRules: new Set(),
      fileConnections,
      showOrphans: false,
      visitCounts: {},
      workspaceRoot: '/workspace',
      getPluginForFile: () => typescriptPlugin,
    });

    expect(graph.nodes.map((node) => node.id)).toEqual(['src/index.ts', 'src/utils.ts']);
    expect(graph.edges).toEqual([
      {
        id: 'src/index.ts->src/utils.ts',
        from: 'src/index.ts',
        to: 'src/utils.ts',
      },
    ]);
  });
});
