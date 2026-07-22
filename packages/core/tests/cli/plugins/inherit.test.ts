import { describe, expect, it, vi } from 'vitest';

import type { PluginsCommandDependencies } from '../../../src/cli/plugins/dependencies';
import { runInheritCommand } from '../../../src/cli/plugins/inherit';

describe('cli/plugins/inherit', () => {
  it('returns a workspace plugin to its global activation default', () => {
    const inheritWorkspacePlugin = vi.fn();
    const dependencies = {
      cwd: () => '/workspace/current',
      inheritWorkspacePlugin,
      readInstalledPluginCache: () => ({ version: 3, plugins: [] }),
    } as unknown as PluginsCommandDependencies;

    expect(runInheritCommand({
      name: 'plugins',
      action: 'inherit',
      packageName: 'codegraphy.particles',
    }, dependencies)).toEqual({
      exitCode: 0,
      output: 'codegraphy.particles now uses the global default for /workspace/current.',
    });
    expect(inheritWorkspacePlugin).toHaveBeenCalledWith(
      '/workspace/current',
      'codegraphy.particles',
    );
  });
});
