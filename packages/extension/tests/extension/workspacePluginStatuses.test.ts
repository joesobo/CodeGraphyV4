import { describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '../../src/core/discovery';
import type { IConnection, IPlugin, IPluginInfo, IRule } from '../../src/core/plugins';
import { buildWorkspacePluginStatuses } from '../../src/extension/workspacePluginStatuses';

function createRule(id: string, name: string): IRule {
  return {
    id,
    name,
    description: `${name} description`,
  };
}

function createPluginInfo(overrides: Partial<IPlugin>): IPluginInfo {
  const plugin: IPlugin = {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    detectConnections: vi.fn(async () => []),
    ...overrides,
  };

  return {
    plugin,
    builtIn: true,
  };
}

describe('workspacePluginStatuses', () => {
  it('sorts statuses and classifies plugins as active, installed, or inactive', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.python',
        name: 'Python',
        supportedExtensions: ['.py'],
      }),
      createPluginInfo({
        id: 'plugin.alpha',
        name: 'Alpha',
        supportedExtensions: ['.ts'],
      }),
      createPluginInfo({
        id: 'plugin.markdown',
        name: 'Markdown',
        supportedExtensions: ['.md'],
      }),
    ];
    const discoveredFiles: Pick<IDiscoveredFile, 'relativePath'>[] = [
      { relativePath: 'src/index.ts' },
      { relativePath: 'README.md' },
    ];
    const fileConnections = new Map<string, IConnection[]>([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' }]],
      ['README.md', [{ specifier: './guide', resolvedPath: null, type: 'static' }]],
    ]);

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      disabledRules: new Set(),
      discoveredFiles,
      fileConnections,
      pluginInfos,
      workspaceRoot: '/workspace',
      getPluginForFile: (absolutePath) => {
        if (absolutePath.endsWith('.ts')) {
          return pluginInfos[1].plugin;
        }
        if (absolutePath.endsWith('.md')) {
          return pluginInfos[2].plugin;
        }
        return undefined;
      },
    });

    expect(statuses.map((status) => status.name)).toEqual(['Alpha', 'Markdown', 'Python']);
    expect(statuses.find((status) => status.id === 'plugin.alpha')?.status).toBe('active');
    expect(statuses.find((status) => status.id === 'plugin.markdown')?.status).toBe('installed');
    expect(statuses.find((status) => status.id === 'plugin.python')?.status).toBe('inactive');
  });

  it('counts resolved rule connections and marks disabled plugins and rules', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
        rules: [
          createRule('es6-import', 'ES6 import'),
          createRule('dynamic-import', 'Dynamic import'),
        ],
      }),
    ];
    const fileConnections = new Map<string, IConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', ruleId: 'es6-import' },
        { specifier: './lazy', resolvedPath: '/workspace/src/lazy.ts', type: 'dynamic', ruleId: 'dynamic-import' },
        { specifier: 'external-package', resolvedPath: null, type: 'static', ruleId: 'es6-import' },
      ]],
    ]);

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(['plugin.typescript']),
      disabledRules: new Set(['plugin.typescript:dynamic-import']),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections,
      pluginInfos,
      workspaceRoot: '/workspace',
      getPluginForFile: () => pluginInfos[0].plugin,
    });

    expect(statuses[0]).toMatchObject({
      id: 'plugin.typescript',
      enabled: false,
      connectionCount: 2,
    });
    expect(statuses[0].rules).toEqual([
      expect.objectContaining({
        id: 'es6-import',
        qualifiedId: 'plugin.typescript:es6-import',
        enabled: true,
        connectionCount: 1,
      }),
      expect.objectContaining({
        id: 'dynamic-import',
        qualifiedId: 'plugin.typescript:dynamic-import',
        enabled: false,
        connectionCount: 1,
      }),
    ]);
  });

  it('ignores connections that belong to other plugins', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
      }),
      createPluginInfo({
        id: 'plugin.python',
        name: 'Python',
        supportedExtensions: ['.py'],
      }),
    ];
    const fileConnections = new Map<string, IConnection[]>([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' }]],
      ['main.py', [{ specifier: 'config', resolvedPath: '/workspace/config.py', type: 'static' }]],
    ]);

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      disabledRules: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }, { relativePath: 'main.py' }],
      fileConnections,
      pluginInfos,
      workspaceRoot: '/workspace',
      getPluginForFile: (absolutePath) => {
        if (absolutePath.endsWith('.ts')) {
          return pluginInfos[0].plugin;
        }
        if (absolutePath.endsWith('.py')) {
          return pluginInfos[1].plugin;
        }
        return undefined;
      },
    });

    expect(statuses.find((status) => status.id === 'plugin.typescript')?.connectionCount).toBe(1);
    expect(statuses.find((status) => status.id === 'plugin.python')?.connectionCount).toBe(1);
  });

  it('ignores files when no plugin matches their path', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      disabledRules: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' }]],
      ]),
      pluginInfos,
      workspaceRoot: '/workspace',
      getPluginForFile: () => undefined,
    });

    expect(statuses[0].connectionCount).toBe(0);
    expect(statuses[0].status).toBe('installed');
  });

  it('counts connections without rule ids toward plugin totals only', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
        rules: [createRule('es6-import', 'ES6 import')],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      disabledRules: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map<string, IConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' }]],
      ]),
      pluginInfos,
      workspaceRoot: '/workspace',
      getPluginForFile: () => pluginInfos[0].plugin,
    });

    expect(statuses[0].connectionCount).toBe(1);
    expect(statuses[0].rules[0].connectionCount).toBe(0);
  });

  it('returns an empty rule list when a plugin declares no rules', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.markdown',
        name: 'Markdown',
        supportedExtensions: ['.md'],
        rules: undefined,
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      disabledRules: new Set(),
      discoveredFiles: [{ relativePath: 'README.md' }],
      fileConnections: new Map<string, IConnection[]>([
        ['README.md', []],
      ]),
      pluginInfos,
      workspaceRoot: '/workspace',
      getPluginForFile: () => pluginInfos[0].plugin,
    });

    expect(statuses[0].rules).toEqual([]);
  });
});
