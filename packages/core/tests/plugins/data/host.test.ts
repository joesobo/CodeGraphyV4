import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createWorkspacePluginDataHost,
  getWorkspaceSettingsPath,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyWorkspaceSettings,
} from '../../../src';

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-plugin-data-'));
}

describe('Workspace plugin data host', () => {
  it('loads fallback data without writing settings before a plugin saves data', async () => {
    const workspaceRoot = await createWorkspace();
    const host = createWorkspacePluginDataHost(workspaceRoot, 'codegraphy.organize');

    expect(host.loadData({ sections: [] })).toEqual({ sections: [] });
    await expect(fs.access(getWorkspaceSettingsPath(workspaceRoot))).rejects.toThrow();
  });

  it('saves and reloads plugin-owned data under plugin id while preserving workspace plugin settings', async () => {
    const workspaceRoot = await createWorkspace();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      }],
    });

    const host = createWorkspacePluginDataHost(workspaceRoot, 'codegraphy.organize');
    await host.saveData({ sections: ['frontend'] }, { undoLabel: 'Save section' });

    expect(createWorkspacePluginDataHost(workspaceRoot, 'codegraphy.organize').loadData({
      sections: [],
    })).toEqual({
      sections: ['frontend'],
    });
    expect(JSON.parse(
      await fs.readFile(getWorkspaceSettingsPath(workspaceRoot), 'utf-8'),
    )).toMatchObject({
      plugins: [{
        package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      }],
      pluginData: {
        'codegraphy.organize': {
          sections: ['frontend'],
        },
      },
    });
  });
});
