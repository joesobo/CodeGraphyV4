import { describe, expect, it, vi } from 'vitest';
import { runEnableCommand } from '../../../src/cli/plugins/enable';
import type { PluginsCommandDependencies } from '../../../src/cli/plugins/dependencies';

function dependencies(overrides: Partial<PluginsCommandDependencies> = {}): PluginsCommandDependencies {
  return {
    cwd: () => '/workspace/current',
    disableWorkspacePlugin: vi.fn(),
    enableWorkspacePlugin: vi.fn(),
    inheritWorkspacePlugin: vi.fn(),
    linkInstalledPluginPackage: vi.fn(),
    readInstalledPluginCache: () => ({ version: 3, plugins: [] }),
    registerInstalledPlugin: vi.fn(),
    resolveGlobalPackageRoots: () => [],
    setGlobalPluginActivation: vi.fn(),
    ...overrides,
  };
}

describe('cli/plugins/enable', () => {
  it('requires a package name before looking at the registry', () => {
    const deps = dependencies({
      readInstalledPluginCache: vi.fn(),
    });

    expect(runEnableCommand({ name: 'plugins', action: 'enable' }, deps)).toEqual({
      exitCode: 1,
      output: 'Usage: codegraphy plugins enable <plugin-id-or-package>',
    });
    expect(deps.readInstalledPluginCache).not.toHaveBeenCalled();
  });

  it('reports packages that have not been registered globally', () => {
    expect(runEnableCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
    }, dependencies())).toEqual({
      exitCode: 1,
      output: "Plugin '@codegraphy-dev/plugin-vue' is not in ~/.codegraphy/plugins.json. Run `codegraphy plugins register @codegraphy-dev/plugin-vue`, then retry.",
    });
  });

  it('enables a registered package in the resolved workspace', () => {
    const enableWorkspacePlugin = vi.fn();
    const plugin = {
      package: '@codegraphy-dev/plugin-vue',
      id: 'codegraphy.vue',
      version: '1.0.0',
      host: 'core',
      entry: './plugin.js',
      apiVersion: '^4.0.0',
      packageRoot: '/global/plugin-vue',
      globallyEnabled: false,
    };

    expect(runEnableCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: '../repo',
    }, dependencies({
      cwd: () => '/workspace/current',
      enableWorkspacePlugin,
      readInstalledPluginCache: () => ({ version: 3, plugins: [plugin] }),
    }))).toEqual({
      exitCode: 0,
      output: 'Enabled codegraphy.vue for /workspace/repo. Run `codegraphy -C "/workspace/repo" index` to refresh the Graph Cache.',
    });
    expect(enableWorkspacePlugin).toHaveBeenCalledWith('/workspace/repo', plugin);
  });

  it('enables every plugin descriptor when the selector is a package name', () => {
    const enableWorkspacePlugin = vi.fn();
    const records = [
      {
        package: '@acme/codegraphy-tools',
        id: 'acme.core',
        version: '1.0.0',
        host: 'core',
        entry: './core.js',
        apiVersion: '^4.0.0',
        packageRoot: '/global/codegraphy-tools',
        globallyEnabled: false,
      },
      {
        package: '@acme/codegraphy-tools',
        id: 'acme.ui',
        version: '1.0.0',
        host: 'acme.ui',
        entry: './ui.js',
        apiVersion: '^1.0.0',
        packageRoot: '/global/codegraphy-tools',
        globallyEnabled: false,
      },
    ];

    expect(runEnableCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@acme/codegraphy-tools',
    }, dependencies({
      enableWorkspacePlugin,
      readInstalledPluginCache: () => ({ version: 3, plugins: records }),
    }))).toMatchObject({ exitCode: 0 });
    expect(enableWorkspacePlugin.mock.calls).toEqual([
      ['/workspace/current', records[0]],
      ['/workspace/current', records[1]],
    ]);
  });

  it('enables a registered plugin globally without resolving a workspace', () => {
    const setGlobalPluginActivation = vi.fn();
    const plugin = {
      package: '@codegraphy-dev/plugin-particles',
      id: 'codegraphy.particles',
      version: '1.0.0',
      host: 'core',
      entry: './plugin.js',
      apiVersion: '^4.0.0',
      packageRoot: '/global/plugin-particles',
      globallyEnabled: false,
    };

    expect(runEnableCommand({
      name: 'plugins',
      action: 'enable',
      packageName: 'codegraphy.particles',
      pluginScope: 'global',
    }, dependencies({
      cwd: () => {
        throw new Error('workspace resolution must stay dormant');
      },
      readInstalledPluginCache: () => ({ version: 3, plugins: [plugin] }),
      setGlobalPluginActivation,
    }))).toEqual({
      exitCode: 0,
      output: 'Enabled codegraphy.particles globally.',
    });
    expect(setGlobalPluginActivation).toHaveBeenCalledWith('codegraphy.particles', true, {});
  });
});
