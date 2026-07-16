import { describe, expect, it, vi } from 'vitest';
import { runEnableCommand } from '../../../src/cli/plugins/enable';
import type { PluginsCommandDependencies } from '../../../src/cli/plugins/dependencies';

function dependencies(overrides: Partial<PluginsCommandDependencies> = {}): PluginsCommandDependencies {
  return {
    cwd: () => '/workspace/current',
    disableWorkspacePlugin: vi.fn(),
    enableWorkspacePlugin: vi.fn(),
    linkInstalledPluginPackage: vi.fn(),
    readInstalledPluginCache: () => ({ version: 1, plugins: [] }),
    registerInstalledPlugin: vi.fn(),
    resolveGlobalPackageRoots: () => [],
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
      output: 'Usage: codegraphy plugins enable <plugin-id-or-package> [workspace]',
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
      readInstalledPluginCache: () => ({ version: 1, plugins: [plugin] }),
    }))).toEqual({
      exitCode: 0,
      output: 'Enabled codegraphy.vue for /workspace/repo. Run `codegraphy index /workspace/repo` to refresh the Graph Cache.',
    });
    expect(enableWorkspacePlugin).toHaveBeenCalledWith('/workspace/repo', plugin);
  });
});
