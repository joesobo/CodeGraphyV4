import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  createBundledMarkdownInstalledPluginRecord,
  writeCodeGraphyInstalledPluginCache,
} from '@codegraphy-dev/core';
import { describe, expect, it } from 'vitest';
import {
  getBuiltInWorkspacePipelinePluginRegistrations,
} from '../../../../../src/extension/pipeline/plugins/bootstrap/builtIns';

describe('pipeline/plugins/bootstrap Markdown runtime loading', () => {
  it('does not register Markdown when Plugin Activity State disables it', async () => {
    await expect(getBuiltInWorkspacePipelinePluginRegistrations(
      {
        version: 1,
        maxFiles: 1000,
        include: ['**/*'],
        respectGitignore: true,
        filterPatterns: [],
        disabledCustomFilterPatterns: [],
        plugins: [{ id: 'codegraphy.markdown', activation: 'enabled' }],
        interfaces: [],
        pluginData: {},
      },
      ['codegraphy.markdown'],
    )).resolves.toEqual([]);
  });

  it('does not register Markdown when the workspace inherits a disabled global default', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        ...createBundledMarkdownInstalledPluginRecord(),
        globallyEnabled: false,
      }],
    }, { homeDir });

    await expect(getBuiltInWorkspacePipelinePluginRegistrations(
      {
        version: 1,
        maxFiles: 1000,
        include: ['**/*'],
        respectGitignore: true,
        filterPatterns: [],
        disabledCustomFilterPatterns: [],
        plugins: [{ id: 'codegraphy.markdown', activation: 'inherit' }],
        interfaces: [],
        pluginData: {},
      },
      [],
      { homeDir },
    )).resolves.toEqual([]);
  });
});
