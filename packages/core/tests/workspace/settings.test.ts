import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  createCodeGraphyWorkspaceSettingsSignature,
  ensureCodeGraphyWorkspaceSettings,
  getWorkspaceSettingsPath,
  readCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-settings-'));
}

describe('CodeGraphy Workspace settings', () => {
  it('materializes Markdown as the first default plugin for a new workspace', async () => {
    const workspaceRoot = await createWorkspace();

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([]);

    const settings = ensureCodeGraphyWorkspaceSettings(workspaceRoot);

    expect(settings.plugins).toEqual([{
      package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    }]);
    expect(JSON.parse(
      await fs.readFile(getWorkspaceSettingsPath(workspaceRoot), 'utf-8'),
    )).toEqual(expect.not.objectContaining({
      disabledPluginFilterPatterns: expect.anything(),
    }));
    expect(JSON.parse(
      await fs.readFile(getWorkspaceSettingsPath(workspaceRoot), 'utf-8'),
    )).toMatchObject({
      plugins: [{
        package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      }],
    });
  });

  it('normalizes legacy top-level disabled plugin filters away', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.dirname(getWorkspaceSettingsPath(workspaceRoot)), { recursive: true });
    await fs.writeFile(
      getWorkspaceSettingsPath(workspaceRoot),
      JSON.stringify({
        disabledPluginFilterPatterns: ['**/dist/**'],
      }),
      'utf-8',
    );

    expect('disabledPluginFilterPatterns' in readCodeGraphyWorkspaceSettings(workspaceRoot)).toBe(false);
  });

  it('reports initial Markdown defaults without writing settings for a new workspace', async () => {
    const workspaceRoot = await createWorkspace();

    expect(readCodeGraphyWorkspaceSettingsOrInitial(workspaceRoot).plugins).toEqual([{
      package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    }]);
    await expect(fs.access(getWorkspaceSettingsPath(workspaceRoot))).rejects.toThrow();
  });

  it('normalizes workspace plugin entries from settings.json', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.dirname(getWorkspaceSettingsPath(workspaceRoot)), { recursive: true });
    await fs.writeFile(
      getWorkspaceSettingsPath(workspaceRoot),
      JSON.stringify({
        maxFiles: 50,
        plugins: [
          {
            package: '@codegraphy/plugin-python',
            disabledFilterPatterns: ['**/__pycache__/**', 42],
            options: { includeTests: true },
          },
          { package: '' },
          { name: '@codegraphy/plugin-legacy' },
        ],
      }),
      'utf-8',
    );

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot)).toMatchObject({
      maxFiles: 50,
      plugins: [{
        package: '@codegraphy/plugin-python',
        disabledFilterPatterns: ['**/__pycache__/**'],
        options: { includeTests: true },
      }],
    });
  });

  it('writes plugin array order into the settings signature', async () => {
    const workspaceRoot = await createWorkspace();
    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);

    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: [
        { package: '@codegraphy/plugin-markdown' },
        { package: '@codegraphy/plugin-python' },
      ],
    });

    const firstSignature = createCodeGraphyWorkspaceSettingsSignature(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    );
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: [
        { package: '@codegraphy/plugin-python' },
        { package: '@codegraphy/plugin-markdown' },
      ],
    });

    expect(createCodeGraphyWorkspaceSettingsSignature(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    )).not.toBe(firstSignature);
  });
});
