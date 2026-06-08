import { describe, expect, it, vi } from 'vitest';
import {
  buildWorkspaceIndexPluginStatuses,
  countWorkspaceIndexPluginConnections,
  getRegisteredWorkspaceIndexPluginPackageNames,
  getWorkspaceIndexPluginMatchingFiles,
  getWorkspaceIndexPluginNameForFile,
  getWorkspaceIndexPluginStatuses,
  resolveWorkspaceIndexPluginNameForFile,
  supportsWorkspaceIndexPluginExtension,
} from '../../src';

describe('plugins/status', () => {
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
          apiVersion: '^2.0.0',
          disclosures: [],
          package: '@codegraphy-dev/plugin-typescript',
          packageRoot: '/plugins/typescript',
          pluginId: 'plugin.typescript',
          pluginName: 'TypeScript',
          version: '1.0.0',
          supportedExtensions: ['.ts'],
        },
        {
          apiVersion: '^2.0.0',
          disclosures: [],
          package: '@acme/missing',
          packageRoot: '/plugins/missing',
          pluginId: 'plugin.missing',
          pluginName: 'Missing',
          version: '2.0.0',
          supportedExtensions: ['.acme'],
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
          apiVersion: '^2.0.0',
          disclosures: [],
          package: '@codegraphy-dev/plugin-typescript',
          packageRoot: '/plugins/typescript',
          pluginId: 'plugin.typescript',
          pluginName: 'TypeScript',
          version: '1.0.0',
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

  it('keeps package-backed registered plugins disabled until workspace activity enables their plugin ID', () => {
    expect(
      buildWorkspaceIndexPluginStatuses({
        disabledPlugins: new Set<string>(),
        discoveredFiles: [{ relativePath: 'src/index.ts' }],
        fileConnections: new Map(),
        installedPlugins: [{
          apiVersion: '^2.0.0',
          disclosures: [],
          package: '@codegraphy-dev/plugin-typescript',
          packageRoot: '/plugins/typescript',
          pluginId: 'plugin.typescript',
          pluginName: 'TypeScript',
          version: '1.0.0',
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
          apiVersion: '^2.0.0',
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

  it('returns undefined for plugin names when no workspace root is available', () => {
    const getPluginForFile = vi.fn();

    expect(
      resolveWorkspaceIndexPluginNameForFile(
        'src/index.ts',
        '',
        () => undefined,
        { getPluginForFile } as never,
      ),
    ).toBeUndefined();
    expect(getPluginForFile).not.toHaveBeenCalled();
  });

  it('resolves plugin names from the current workspace root when no cached root exists', () => {
    const getWorkspaceRoot = vi.fn(() => '/workspace');
    const getPluginForFile = vi.fn(() => ({ name: 'TypeScript' }));

    expect(
      resolveWorkspaceIndexPluginNameForFile(
        'src/index.ts',
        '',
        getWorkspaceRoot,
        { getPluginForFile } as never,
      ),
    ).toBe('TypeScript');
    expect(getWorkspaceRoot).toHaveBeenCalledOnce();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('prefers the cached workspace root when resolving plugin names', () => {
    const getWorkspaceRoot = vi.fn(() => '/other');
    const getPluginForFile = vi.fn(() => ({ name: 'TypeScript' }));

    expect(
      resolveWorkspaceIndexPluginNameForFile(
        'src/index.ts',
        '/workspace',
        getWorkspaceRoot,
        { getPluginForFile } as never,
      ),
    ).toBe('TypeScript');
    expect(getWorkspaceRoot).not.toHaveBeenCalled();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('returns undefined when the resolved plugin lookup has no match', () => {
    const getPluginForFile = vi.fn(() => undefined);

    expect(
      getWorkspaceIndexPluginNameForFile(
        'src/index.ts',
        '/workspace',
        { getPluginForFile } as never,
      ),
    ).toBeUndefined();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('omits the core Tree-sitter runtime from plugin display names', () => {
    const getPluginForFile = vi.fn(() => ({
      id: 'codegraphy.treesitter',
      name: 'Tree-sitter',
    }));

    expect(
      getWorkspaceIndexPluginNameForFile(
        'src/index.ts',
        '/workspace',
        { getPluginForFile } as never,
      ),
    ).toBeUndefined();
    expect(getPluginForFile).toHaveBeenCalledWith('/workspace/src/index.ts');
  });

  it('matches plugin files case-insensitively for targeted refreshes', () => {
    expect(supportsWorkspaceIndexPluginExtension(['.TS'], '.ts')).toBe(true);
    expect(
      getWorkspaceIndexPluginMatchingFiles(
        { plugin: { supportedExtensions: ['.TS'] } },
        [
          { relativePath: 'src/app.ts' },
          { relativePath: 'README.md' },
        ],
      ),
    ).toEqual([{ relativePath: 'src/app.ts' }]);
  });
});
