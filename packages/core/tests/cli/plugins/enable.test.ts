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
    readInstalledPluginCache: () => ({ version: 2, plugins: [] }),
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
      pluginId: 'codegraphy.vue',
      version: '1.0.0',
      apiVersion: '^3.0.0',
      disclosures: [],
      packageRoot: '/global/plugin-vue',
    };

    expect(runEnableCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: '../repo',
    }, dependencies({
      cwd: () => '/workspace/current',
      enableWorkspacePlugin,
      readInstalledPluginCache: () => ({ version: 2, plugins: [plugin] }),
    }))).toEqual({
      exitCode: 0,
      output: 'Enabled codegraphy.vue for /workspace/repo. Run `codegraphy -C "/workspace/repo" index` to refresh the Graph Cache.',
    });
    expect(enableWorkspacePlugin).toHaveBeenCalledWith('/workspace/repo', plugin);
  });

  it('enables a registered plugin globally without resolving a workspace', () => {
    const setGlobalPluginActivation = vi.fn();
    const plugin = {
      package: '@codegraphy-dev/plugin-particles',
      pluginId: 'codegraphy.particles',
      version: '1.0.0',
      apiVersion: '^3.0.0',
      disclosures: [],
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
      readInstalledPluginCache: () => ({ version: 2, plugins: [plugin] }),
      setGlobalPluginActivation,
    }))).toEqual({
      exitCode: 0,
      output: 'Enabled codegraphy.particles globally.',
    });
    expect(setGlobalPluginActivation).toHaveBeenCalledWith('codegraphy.particles', true, {});
  });
});
