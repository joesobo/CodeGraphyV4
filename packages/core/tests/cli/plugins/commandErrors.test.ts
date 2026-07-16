import { describe, expect, it } from 'vitest';

import { runPluginsCommand } from '../../../src/cli/plugins/command';

describe('plugins/command help and failures', () => {
  it('returns plugin help for unknown actions', async () => {
    await expect(runPluginsCommand({
      name: 'plugins',
      action: 'help',
    })).resolves.toEqual({
      exitCode: 0,
      output: [
        'CodeGraphy plugin commands',
        '',
        'Commands:',
        '  codegraphy plugins register <package>',
        '  codegraphy plugins link <package-root>',
        '  codegraphy plugins list [workspace]',
        '  codegraphy plugins enable <plugin-id-or-package> [workspace]',
        '  codegraphy plugins disable <plugin-id-or-package> [workspace]',
      ].join('\n'),
    });
  });

  it('turns plugin command exceptions into failed command output', async () => {
    await expect(runPluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    }, {
      resolveGlobalPackageRoots: () => ['/global'],
      registerInstalledPlugin: async () => {
        throw new Error('plugin package is broken');
      },
    })).resolves.toEqual({
      exitCode: 1,
      output: 'plugin package is broken',
    });
  });
});
