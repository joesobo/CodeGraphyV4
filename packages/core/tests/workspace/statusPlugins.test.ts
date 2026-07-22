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
      version: 3,
      plugins: [{
        package: '@acme/codegraphy-plugin-example',
        id: 'acme.example',
        version: '1.0.0',
        host: 'core',
        entry: './plugin.js',
        apiVersion: '^4.0.0',
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
