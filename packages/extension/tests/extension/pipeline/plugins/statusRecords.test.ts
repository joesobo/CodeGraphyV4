import { describe, expect, it } from 'vitest';
import { buildRegisteredPluginStatus, buildUnregisteredInstalledPluginStatus, getRegisteredPackageNames, isUserFacingPlugin } from '../../../../src/extension/pipeline/plugins/statusRecords';
import { createInstalledPlugin, createPluginInfo } from './testFactories';

describe('pipeline/plugins/statusRecords', () => {
  it('classifies registered plugins from matching file and connection counts', () => {
    const pluginInfo = createPluginInfo({
      id: 'plugin.markdown',
      name: 'Markdown',
      version: '2.0.0',
      supportedExtensions: ['.md'],
    });

    expect(buildRegisteredPluginStatus({
      connectionCount: 3,
      disabledPlugins: new Set(),
      matchingFileCount: 1,
      pluginInfo,
    })).toMatchObject({
      id: 'plugin.markdown',
      name: 'Markdown',
      status: 'active',
      enabled: true,
      connectionCount: 3,
    });

    expect(buildRegisteredPluginStatus({
      connectionCount: 0,
      disabledPlugins: new Set(),
      matchingFileCount: 1,
      pluginInfo,
    }).status).toBe('installed');

    expect(buildRegisteredPluginStatus({
      connectionCount: 0,
      disabledPlugins: new Set(),
      matchingFileCount: 0,
      pluginInfo,
    }).status).toBe('inactive');
  });

  it('uses workspace package settings for package-backed registered plugin enablement', () => {
    const pluginInfo = {
      ...createPluginInfo({ id: 'codegraphy.markdown' }),
      sourcePackage: '@codegraphy-dev/plugin-markdown',
    };

    expect(buildRegisteredPluginStatus({
      connectionCount: 0,
      disabledPlugins: new Set(['codegraphy.markdown']),
      matchingFileCount: 1,
      pluginInfo,
      workspaceEnabledPackageNames: new Set(['@codegraphy-dev/plugin-markdown']),
    })).toMatchObject({
      packageName: '@codegraphy-dev/plugin-markdown',
      enabled: true,
    });
  });

  it('keeps internal built-in runtime plugins out of user-facing statuses', () => {
    expect(isUserFacingPlugin({
      ...createPluginInfo({ id: 'codegraphy.treesitter' }),
      builtIn: true,
    })).toBe(false);
    expect(isUserFacingPlugin({
      ...createPluginInfo({ id: 'codegraphy.markdown' }),
      builtIn: true,
      sourcePackage: '@codegraphy-dev/plugin-markdown',
    })).toBe(true);
  });

  it('collects only package-backed registered plugin names', () => {
    expect(getRegisteredPackageNames([
      createPluginInfo({ id: 'legacy.python' }),
      {
        ...createPluginInfo({ id: 'codegraphy.markdown' }),
        sourcePackage: '@codegraphy-dev/plugin-markdown',
      },
    ])).toEqual(new Set(['@codegraphy-dev/plugin-markdown']));
  });

  it('builds installed package statuses from workspace enablement', () => {
    const installedPlugin = createInstalledPlugin({
      package: '@codegraphy-dev/plugin-python',
      version: '2.1.0',
    });

    expect(buildUnregisteredInstalledPluginStatus(
      installedPlugin,
      new Set(['@codegraphy-dev/plugin-python']),
    )).toMatchObject({
      id: '@codegraphy-dev/plugin-python',
      packageName: '@codegraphy-dev/plugin-python',
      status: 'unavailable',
      enabled: true,
      version: '2.1.0',
      connectionCount: 0,
    });

    expect(buildUnregisteredInstalledPluginStatus(installedPlugin, new Set())).toMatchObject({
      status: 'installed',
      enabled: false,
    });

    expect(buildUnregisteredInstalledPluginStatus(installedPlugin)).toMatchObject({
      status: 'installed',
      enabled: false,
    });
  });
});
