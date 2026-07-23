import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  readCodeGraphyInstalledPluginCache,
  setCodeGraphyInstalledPluginGlobalActivation,
  writeCodeGraphyInstalledPluginCache,
} from '../../../src';

describe('plugins/installedPluginCache global activation', () => {
  it('changes the global default for one installed plugin without loading it', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [
        {
          package: '@codegraphy-dev/plugin-vue',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/plugin-vue',
          id: 'codegraphy.vue',
          globallyEnabled: false,
        },
        {
          package: '@codegraphy-dev/plugin-particles',
          version: '1.0.0',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
          packageRoot: '/global/plugin-particles',
          id: 'codegraphy.particles',
          globallyEnabled: false,
        },
      ],
    }, { homeDir });

    const particles = readCodeGraphyInstalledPluginCache({ homeDir }).plugins[1];
    setCodeGraphyInstalledPluginGlobalActivation(particles, true, { homeDir });

    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([
      expect.objectContaining({ id: 'codegraphy.vue', globallyEnabled: false }),
      expect.objectContaining({ id: 'codegraphy.particles', globallyEnabled: true }),
    ]);
  });
});
