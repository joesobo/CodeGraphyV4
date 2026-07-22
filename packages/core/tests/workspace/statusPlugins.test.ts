import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { writeCodeGraphyInstalledPluginCache } from '../../src/plugins/installedCache';
import { createInitialCodeGraphyWorkspaceSettings } from '../../src/workspace/settings';
import { createDefaultStatusPluginSignature } from '../../src/workspace/statusPlugins';

describe('workspace status plugin signature', () => {
  it('includes globally enabled plugins inherited by the workspace', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-status-home-'));
    writeCodeGraphyInstalledPluginCache({
      version: 2,
      plugins: [{
        package: '@acme/codegraphy-plugin-example',
        pluginId: 'acme.example',
        version: '1.0.0',
        apiVersion: '^3.0.0',
        disclosures: [],
        packageRoot: '/global/codegraphy-plugin-example',
        globallyEnabled: true,
      }],
    }, { homeDir });

    expect(createDefaultStatusPluginSignature(
      createInitialCodeGraphyWorkspaceSettings(),
      homeDir,
    )).toContain('npm:@acme/codegraphy-plugin-example@1.0.0');
  });
});
