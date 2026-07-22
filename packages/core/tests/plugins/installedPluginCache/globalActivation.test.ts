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
      version: 2,
      plugins: [
        {
          package: '@codegraphy-dev/plugin-vue',
          version: '1.0.0',
          apiVersion: '^3.0.0',
          disclosures: [],
          packageRoot: '/global/plugin-vue',
          pluginId: 'codegraphy.vue',
          globallyEnabled: false,
        },
        {
          package: '@codegraphy-dev/plugin-particles',
          version: '1.0.0',
          apiVersion: '^3.0.0',
          disclosures: [],
          packageRoot: '/global/plugin-particles',
          pluginId: 'codegraphy.particles',
          globallyEnabled: false,
        },
      ],
    }, { homeDir });

    setCodeGraphyInstalledPluginGlobalActivation('codegraphy.particles', true, { homeDir });

    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([
      expect.objectContaining({ pluginId: 'codegraphy.vue', globallyEnabled: false }),
      expect.objectContaining({ pluginId: 'codegraphy.particles', globallyEnabled: true }),
    ]);
  });
});
