import { describe, expect, it, vi } from 'vitest';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import type { IProjectedConnection, IPlugin, IPluginInfo } from '../../../../src/core/plugins/types/contracts';
import { buildWorkspacePluginStatuses } from '../../../../src/extension/pipeline/plugins/statusBuilder';

function createPluginInfo(overrides: Partial<IPlugin>): IPluginInfo {
  const plugin: IPlugin = {
    id: 'test.plugin',
    name: 'Test Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.ts'],
    analyzeFile: vi.fn(async (filePath: string) => ({ filePath, relations: [] })),
    ...overrides,
  } as IPlugin;

  return {
    plugin,
    builtIn: false,
  };
}

describe('pipeline/plugins/statusBuilder', () => {
  it('preserves plugin order and classifies plugins as active, installed, or inactive', () => {
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
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' , pluginId: 'plugin.alpha', sourceId: 'test-source', kind: 'import' }]],
      ['README.md', [{ specifier: './guide', resolvedPath: null, type: 'static' , pluginId: 'plugin.markdown', sourceId: 'test-source', kind: 'import' }]],
    ]);

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles,
      fileConnections,
      pluginInfos,
    });

    expect(statuses.map((status) => status.name)).toEqual(['Python', 'Alpha', 'Markdown']);
    expect(statuses.find((status) => status.id === 'plugin.alpha')?.status).toBe('active');
    expect(statuses.find((status) => status.id === 'plugin.markdown')?.status).toBe('installed');
    expect(statuses.find((status) => status.id === 'plugin.python')?.status).toBe('inactive');
  });

  it('hides internal built-in runtime plugins from user-facing plugin statuses', () => {
    const pluginInfos = [
      {
        ...createPluginInfo({
          id: 'codegraphy.treesitter',
          name: 'Tree-sitter',
          supportedExtensions: ['.ts'],
        }),
        builtIn: true,
      },
      {
        ...createPluginInfo({
          id: 'codegraphy.markdown',
          name: 'Markdown',
          supportedExtensions: ['.md'],
        }),
        sourcePackage: '@codegraphy-dev/plugin-markdown',
      },
      {
        ...createPluginInfo({
          id: 'legacy.python',
          name: 'Python',
          supportedExtensions: ['.py'],
        }),
        builtIn: false,
      },
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [
        { relativePath: 'src/index.ts' },
        { relativePath: 'README.md' },
        { relativePath: 'main.py' },
      ],
      fileConnections: new Map(),
      pluginInfos,
    });

    expect(statuses.map(status => status.id)).toEqual([
      'codegraphy.markdown',
      'legacy.python',
    ]);
  });

  it('counts resolved plugin connections and marks disabled plugins', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
      }),
    ];
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [
        { specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', sourceId: 'es6-import' , kind: 'import', pluginId: 'plugin.typescript' },
        { specifier: './lazy', resolvedPath: '/workspace/src/lazy.ts', type: 'dynamic', sourceId: 'dynamic-import' , kind: 'import', pluginId: 'plugin.typescript' },
        { specifier: 'external-package', resolvedPath: null, type: 'static', sourceId: 'es6-import' , kind: 'import', pluginId: 'plugin.typescript' },
      ]],
    ]);

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(['plugin.typescript']),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections,
      pluginInfos,
    });

    expect(statuses[0]).toMatchObject({
      id: 'plugin.typescript',
      enabled: false,
      connectionCount: 2,
    });
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
    const fileConnections = new Map<string, IProjectedConnection[]>([
      ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' , pluginId: 'plugin.typescript', sourceId: 'test-source', kind: 'import' }]],
      ['main.py', [{ specifier: 'config', resolvedPath: '/workspace/config.py', type: 'static' , pluginId: 'plugin.python', sourceId: 'test-source', kind: 'import' }]],
    ]);

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }, { relativePath: 'main.py' }],
      fileConnections,
      pluginInfos,
    });

    expect(statuses.find((status) => status.id === 'plugin.typescript')?.connectionCount).toBe(1);
    expect(statuses.find((status) => status.id === 'plugin.python')?.connectionCount).toBe(1);
  });

  it('treats legacy connections without plugin provenance as unowned', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' , sourceId: 'test-source', kind: 'import' }]],
      ]),
      pluginInfos,
    });

    expect(statuses[0].connectionCount).toBe(0);
    expect(statuses[0].status).toBe('installed');
  });

  it('counts connections without rule ids toward plugin totals', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static' , sourceId: 'test-source', kind: 'import', pluginId: 'plugin.typescript' }]],
      ]),
      pluginInfos,
    });

    expect(statuses[0].connectionCount).toBe(1);
  });

  it('does not expose source status data when a plugin declares sources', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.markdown',
        name: 'Markdown',
        supportedExtensions: ['.md'],
        sources: [
          {
            id: 'wiki-link',
            name: 'Wiki Link',
            description: 'Tracks wiki links.',
          },
        ],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'README.md' }],
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['README.md', []],
      ]),
      pluginInfos,
    });

    expect(statuses[0]).not.toHaveProperty('sources');
  });

  it('ignores disabled sources when building plugin-only statuses', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', sourceId: 'dynamic-import' , kind: 'import', pluginId: 'plugin.typescript' }]],
      ]),
      pluginInfos,
    });
    const disabledSourceStatuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [{ specifier: './utils', resolvedPath: '/workspace/src/utils.ts', type: 'static', sourceId: 'dynamic-import' , kind: 'import', pluginId: 'plugin.typescript' }]],
      ]),
      pluginInfos,
    });

    expect(disabledSourceStatuses).toEqual(statuses);
  });

  it('keeps unknown plugin ids out of ordering and appends unconfigured plugins', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.markdown',
        name: 'Markdown',
        supportedExtensions: ['.md'],
      }),
      createPluginInfo({
        id: 'plugin.typescript',
        name: 'TypeScript',
        supportedExtensions: ['.ts'],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['README.md', []],
        ['src/index.ts', []],
      ]),
      discoveredFiles: [{ relativePath: 'README.md' }, { relativePath: 'src/index.ts' }],
      pluginInfos: [pluginInfos[1], pluginInfos[0]],
    });

    expect(statuses.map((status) => status.id)).toEqual([
      'plugin.typescript',
      'plugin.markdown',
    ]);
  });

  it('counts enrichment plugin connections on the same file extension independently', () => {
    const pluginInfos = [
      createPluginInfo({
        id: 'plugin.base',
        name: 'Base',
        supportedExtensions: ['.ts'],
      }),
      createPluginInfo({
        id: 'plugin.enricher',
        name: 'Enricher',
        supportedExtensions: ['.ts'],
      }),
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'src/index.ts' }],
      fileConnections: new Map<string, IProjectedConnection[]>([
        ['src/index.ts', [
          {
            specifier: './utils',
            resolvedPath: '/workspace/src/utils.ts',
            type: 'static',
            sourceId: 'base-import',
            kind: 'import',
            pluginId: 'plugin.base',
          },
          {
            specifier: './framework',
            resolvedPath: '/workspace/src/framework.ts',
            type: 'static',
            sourceId: 'framework-call',
            kind: 'call',
            pluginId: 'plugin.enricher',
          },
        ]],
      ]),
      pluginInfos,
    });

    expect(statuses).toEqual([
      expect.objectContaining({
        id: 'plugin.base',
        status: 'active',
        connectionCount: 1,
      }),
      expect.objectContaining({
        id: 'plugin.enricher',
        status: 'active',
        connectionCount: 1,
      }),
    ]);
  });

  it('lists globally installed package plugins as disabled when workspace settings do not enable them', () => {
    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [],
      fileConnections: new Map(),
      installedPlugins: [
        {
          package: '@codegraphy-dev/plugin-python',
          version: '2.0.0',
          apiVersion: '^2.0.0',
          disclosures: [],
          packageRoot: '/global/node_modules/@codegraphy-dev/plugin-python',
        },
      ],
      pluginInfos: [],
      workspaceEnabledPackageNames: new Set(),
    });

    expect(statuses).toEqual([
      {
        id: '@codegraphy-dev/plugin-python',
        packageName: '@codegraphy-dev/plugin-python',
        name: '@codegraphy-dev/plugin-python',
        version: '2.0.0',
        supportedExtensions: [],
        status: 'installed',
        enabled: false,
        connectionCount: 0,
      },
    ]);
  });

  it('does not duplicate an installed package plugin that is already registered for the workspace', () => {
    const pluginInfos = [
      {
        ...createPluginInfo({
          id: 'codegraphy.python',
          name: 'Python',
          supportedExtensions: ['.py'],
        }),
        sourcePackage: '@codegraphy-dev/plugin-python',
      },
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'main.py' }],
      fileConnections: new Map([['main.py', []]]),
      installedPlugins: [
        {
          package: '@codegraphy-dev/plugin-python',
          version: '2.0.0',
          apiVersion: '^2.0.0',
          disclosures: [],
          packageRoot: '/global/node_modules/@codegraphy-dev/plugin-python',
        },
      ],
      pluginInfos,
      workspaceEnabledPackageNames: new Set(['@codegraphy-dev/plugin-python']),
    });

    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toMatchObject({
      id: 'codegraphy.python',
      packageName: '@codegraphy-dev/plugin-python',
      enabled: true,
    });
  });

  it('marks enabled installed packages without a registered runtime as unavailable', () => {
    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [],
      fileConnections: new Map(),
      installedPlugins: [
        {
          package: '@codegraphy-dev/plugin-python',
          version: '2.0.0',
          apiVersion: '^2.0.0',
          disclosures: [],
          packageRoot: '/global/node_modules/@codegraphy-dev/plugin-python',
        },
      ],
      pluginInfos: [],
      workspaceEnabledPackageNames: new Set(['@codegraphy-dev/plugin-python']),
    });

    expect(statuses).toEqual([
      expect.objectContaining({
        id: '@codegraphy-dev/plugin-python',
        packageName: '@codegraphy-dev/plugin-python',
        status: 'unavailable',
        enabled: true,
        supportedExtensions: [],
      }),
    ]);
  });

  it('keeps registered package plugins enabled when no workspace settings file exists yet', () => {
    const pluginInfos = [
      {
        ...createPluginInfo({
          id: 'codegraphy.markdown',
          name: 'Markdown',
          supportedExtensions: ['.md'],
        }),
        sourcePackage: '@codegraphy-dev/plugin-markdown',
      },
    ];

    const statuses = buildWorkspacePluginStatuses({
      disabledPlugins: new Set(),
      discoveredFiles: [{ relativePath: 'README.md' }],
      fileConnections: new Map([['README.md', []]]),
      pluginInfos,
    });

    expect(statuses[0]).toMatchObject({
      id: 'codegraphy.markdown',
      packageName: '@codegraphy-dev/plugin-markdown',
      enabled: true,
    });
  });
});
