import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspaceIndexPluginStatuses,
  countWorkspaceIndexPluginConnections,
  getRegisteredWorkspaceIndexPluginPackageNames,
  getWorkspaceIndexPluginStatuses,
} from '../../src';

describe('plugins/status construction', () => {
  it('counts resolved connections owned by matching plugins', () => {
    expect(
      countWorkspaceIndexPluginConnections(
        {
          plugin: {
            id: 'plugin.typescript',
            name: 'TypeScript',
            version: '1.0.0',
            supportedExtensions: ['.ts'],
          },
        },
        new Map([
          ['src/app.ts', [
            { pluginId: 'plugin.typescript', resolvedPath: 'src/util.ts' },
            { pluginId: 'plugin.typescript', resolvedPath: null },
            { pluginId: 'plugin.markdown', resolvedPath: 'README.md' },
          ]],
          ['README.md', [
            { pluginId: 'plugin.typescript', resolvedPath: 'src/app.ts' },
          ]],
        ]),
      ),
    ).toBe(1);
  });

  it('builds registered and installed plugin statuses in workspace order', () => {
    const statuses = buildWorkspaceIndexPluginStatuses({
      disabledPlugins: new Set(['plugin.disabled']),
      discoveredFiles: [
        { relativePath: 'src/index.ts' },
        { relativePath: 'README.md' },
      ],
      fileConnections: new Map([
        ['src/index.ts', [{ pluginId: 'plugin.typescript', resolvedPath: 'src/util.ts' }]],
      ]),
      installedPlugins: [
        {
          package: '@codegraphy-dev/plugin-typescript',
          packageRoot: '/plugins/typescript',
          id: 'plugin.typescript',
          name: 'TypeScript',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          version: '1.0.0',
          globallyEnabled: false,
        },
        {
          package: '@acme/missing',
          packageRoot: '/plugins/missing',
          id: 'plugin.missing',
          name: 'Missing',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          version: '2.0.0',
          globallyEnabled: false,
        },
      ],
      pluginInfos: [
        {
          builtIn: false,
          sourcePackage: '@codegraphy-dev/plugin-typescript',
          plugin: {
            id: 'plugin.typescript',
            name: 'TypeScript',
            version: '1.0.0',
            supportedExtensions: ['.ts'],
          },
        },
        {
          builtIn: false,
          plugin: {
            id: 'plugin.markdown',
            name: 'Markdown',
            version: '1.0.0',
            supportedExtensions: ['.md'],
          },
        },
      ],
      workspaceEnabledPluginIds: new Set(['plugin.typescript']),
    });

    expect(statuses).toEqual([
      expect.objectContaining({
        id: 'plugin.typescript',
        packageName: '@codegraphy-dev/plugin-typescript',
        status: 'active',
        enabled: true,
        connectionCount: 1,
      }),
      expect.objectContaining({
        id: 'plugin.missing',
        packageName: '@acme/missing',
        status: 'installed',
        enabled: false,
      }),
      expect.objectContaining({
        id: 'plugin.markdown',
        status: 'installed',
        enabled: true,
      }),
    ]);
  });

  it('prefers enabled registered statuses over duplicate unavailable installed records', () => {
    expect(
      buildWorkspaceIndexPluginStatuses({
        disabledPlugins: new Set<string>(),
        discoveredFiles: [{ relativePath: 'src/index.ts' }],
        fileConnections: new Map(),
        installedPlugins: [{
          package: '@codegraphy-dev/plugin-typescript',
          packageRoot: '/plugins/typescript',
          id: 'plugin.typescript',
          name: 'TypeScript',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          version: '1.0.0',
          globallyEnabled: false,
        }],
        pluginInfos: [
          {
            builtIn: false,
            sourcePackage: '@codegraphy-dev/plugin-typescript',
            plugin: {
              id: 'plugin.typescript',
              name: 'TypeScript',
              version: '1.0.0',
              supportedExtensions: ['.ts'],
            },
          },
        ],
        workspaceEnabledPluginIds: new Set(['plugin.typescript']),
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'plugin.typescript',
        enabled: true,
        status: 'installed',
      }),
    ]);
  });

  it('keeps independently registered plugin IDs from one package as separate statuses', () => {
    const statuses = buildWorkspaceIndexPluginStatuses({
      disabledPlugins: new Set<string>(),
      discoveredFiles: [
        { relativePath: 'src/app.one' },
        { relativePath: 'src/app.two' },
      ],
      fileConnections: new Map(),
      installedPlugins: [
        {
          package: '@acme/plugin-tools',
          packageRoot: '/plugins/tools',
          id: 'acme.one',
          name: 'Tool One',
          host: 'core',
          entry: './one.js',
          apiVersion: '^4.0.0',
          version: '1.0.0',
          globallyEnabled: true,
        },
        {
          package: '@acme/plugin-tools',
          packageRoot: '/plugins/tools',
          id: 'acme.two',
          name: 'Tool Two',
          host: 'core',
          entry: './two.js',
          apiVersion: '^4.0.0',
          version: '1.0.0',
          globallyEnabled: true,
        },
      ],
      pluginInfos: [
        {
          builtIn: false,
          sourcePackage: '@acme/plugin-tools',
          plugin: {
            id: 'acme.one',
            name: 'Tool One',
            version: '1.0.0',
            supportedExtensions: ['.one'],
          },
        },
        {
          builtIn: false,
          sourcePackage: '@acme/plugin-tools',
          plugin: {
            id: 'acme.two',
            name: 'Tool Two',
            version: '1.0.0',
            supportedExtensions: ['.two'],
          },
        },
      ],
      workspaceEnabledPluginIds: new Set(['acme.one', 'acme.two']),
    });

    expect(statuses.map(status => status.id)).toEqual(['acme.one', 'acme.two']);
    expect(statuses.map(status => status.name)).toEqual(['Tool One', 'Tool Two']);
  });

  it('keeps package-backed registered plugins disabled until workspace activity enables their plugin ID', () => {
    expect(
      buildWorkspaceIndexPluginStatuses({
        disabledPlugins: new Set<string>(),
        discoveredFiles: [{ relativePath: 'src/index.ts' }],
        fileConnections: new Map(),
        installedPlugins: [{
          package: '@codegraphy-dev/plugin-typescript',
          packageRoot: '/plugins/typescript',
          id: 'plugin.typescript',
          name: 'TypeScript',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          version: '1.0.0',
          globallyEnabled: false,
        }],
        pluginInfos: [
          {
            builtIn: false,
            sourcePackage: '@codegraphy-dev/plugin-typescript',
            plugin: {
              id: 'plugin.typescript',
              name: 'TypeScript',
              version: '1.0.0',
              supportedExtensions: ['.ts'],
            },
          },
        ],
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'plugin.typescript',
        enabled: false,
        status: 'installed',
      }),
    ]);
  });

  it('collects package names from registered package-backed plugins', () => {
    expect(
      [...getRegisteredWorkspaceIndexPluginPackageNames([
        {
          builtIn: false,
          sourcePackage: '@codegraphy-dev/plugin-typescript',
          plugin: {
            id: 'plugin.typescript',
            name: 'TypeScript',
            version: '1.0.0',
            supportedExtensions: ['.ts'],
          },
        },
        {
          builtIn: false,
          plugin: {
            id: 'plugin.markdown',
            name: 'Markdown',
            version: '1.0.0',
            supportedExtensions: ['.md'],
          },
        },
      ])],
    ).toEqual(['@codegraphy-dev/plugin-typescript']);
  });

  it('builds plugin statuses from core indexing state', () => {
    const list = vi.fn(() => [
      {
        builtIn: false,
        plugin: {
          id: 'plugin.typescript',
          name: 'TypeScript',
          version: '1.0.0',
          apiVersion: '^4.0.0',
          supportedExtensions: ['.ts'],
          sources: [],
        },
      },
    ]);

    expect(
      getWorkspaceIndexPluginStatuses({
        disabledPlugins: new Set<string>(),
        discoveredFiles: [{ relativePath: 'src/index.ts' }] as never,
        fileConnections: new Map([['src/index.ts', []]]),
        registry: {
          getPluginForFile: vi.fn(() => ({ name: 'TypeScript' })),
          list,
        } as never,
      }),
    ).toEqual([
      expect.objectContaining({
        id: 'plugin.typescript',
        status: 'installed',
      }),
    ]);
    expect(list).toHaveBeenCalledOnce();
  });
});
