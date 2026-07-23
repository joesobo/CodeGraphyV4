import { describe, expect, it, vi } from 'vitest';

import { runDisableCommand } from '../../../src/cli/plugins/disable';
import type { PluginsCommandDependencies } from '../../../src/cli/plugins/dependencies';

describe('cli/plugins/disable', () => {
  it('disables a registered plugin globally without resolving a workspace', () => {
    const setGlobalPluginActivation = vi.fn();
    const dependencies: PluginsCommandDependencies = {
      cwd: () => {
        throw new Error('workspace resolution must stay dormant');
      },
      disableWorkspacePlugin: vi.fn(),
      enableWorkspacePlugin: vi.fn(),
      inheritWorkspacePlugin: vi.fn(),
      linkInstalledPluginPackage: vi.fn(),
      readInstalledPluginCache: () => ({
        version: 3,
        plugins: [{
          package: '@codegraphy-dev/plugin-particles',
          id: 'codegraphy.particles',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/plugin-particles',
          globallyEnabled: true,
        }],
      }),
      registerInstalledPlugin: vi.fn(),
      resolveGlobalPackageRoots: () => [],
      setGlobalPluginActivation,
    };

    expect(runDisableCommand({
      name: 'plugins',
      action: 'disable',
      packageName: 'codegraphy.particles',
      pluginScope: 'global',
    }, dependencies)).toEqual({
      exitCode: 0,
      output: 'Disabled codegraphy.particles globally.',
    });
    expect(setGlobalPluginActivation).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'codegraphy.particles' }),
      false,
      {},
    );
  });
});
