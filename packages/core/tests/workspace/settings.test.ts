import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  createCodeGraphyWorkspaceSettingsSignature,
  ensureCodeGraphyWorkspaceSettings,
  getWorkspaceSettingsPath,
  readCodeGraphyWorkspaceSettings,
  readCodeGraphyWorkspaceSettingsOrInitial,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';
import { createDefaultCodeGraphyWorkspaceSettings } from '../../src/workspace/settingsDefaults';
import { normalizeCodeGraphyWorkspaceSettings } from '../../src/workspace/settingsNormalize';

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-settings-'));
}

describe('CodeGraphy Workspace settings', () => {
  it('materializes Markdown as the first default plugin for a new workspace', async () => {
    const workspaceRoot = await createWorkspace();

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([]);

    const settings = ensureCodeGraphyWorkspaceSettings(workspaceRoot);

    expect(settings.plugins).toEqual([{
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      activation: 'enabled',
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
        id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
        activation: 'enabled',
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
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      activation: 'enabled',
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
            id: 'codegraphy.vue',
            enabled: false,
            disabledFilterPatterns: ['**/__pycache__/**', 42],
            options: { includeTests: true },
          },
          { id: '' },
          { id: 'codegraphy.vue' },
          { name: '@codegraphy-dev/plugin-legacy' },
        ],
      }),
      'utf-8',
    );

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot)).toMatchObject({
      maxFiles: 50,
      plugins: [{
        id: 'codegraphy.vue',
        activation: 'disabled',
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
        { id: 'codegraphy.markdown', activation: 'enabled' },
        { id: 'codegraphy.vue', activation: 'enabled' },
      ],
    });

    const firstSignature = createCodeGraphyWorkspaceSettingsSignature(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    );
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      plugins: [
        { id: 'codegraphy.vue', activation: 'enabled' },
        { id: 'codegraphy.markdown', activation: 'enabled' },
      ],
    });

    expect(createCodeGraphyWorkspaceSettingsSignature(
      readCodeGraphyWorkspaceSettings(workspaceRoot),
    )).not.toBe(firstSignature);
  });

  it('preserves unknown extension settings when Core writes known settings', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.dirname(getWorkspaceSettingsPath(workspaceRoot)), { recursive: true });
    await fs.writeFile(getWorkspaceSettingsPath(workspaceRoot), JSON.stringify({
      version: 2,
      extensionPanelPlacement: 'right',
      nodeVisibility: { file: true },
    }));

    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...settings,
      edgeVisibility: { import: false },
    });

    expect(JSON.parse(await fs.readFile(getWorkspaceSettingsPath(workspaceRoot), 'utf-8'))).toMatchObject({
      version: 2,
      extensionPanelPlacement: 'right',
      nodeVisibility: { file: true },
      edgeVisibility: { import: false },
    });
  });

  it('preserves unmatched future plugins and legacy Markdown entry fields', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.dirname(getWorkspaceSettingsPath(workspaceRoot)), { recursive: true });
    await fs.writeFile(getWorkspaceSettingsPath(workspaceRoot), JSON.stringify({
      version: 2,
      plugins: [
        {
          package: '@codegraphy-dev/plugin-markdown',
          enabled: true,
          futureMarkdownSetting: 'keep',
        },
        { id: 'future.plugin', futureOnlyShape: true },
        3,
      ],
    }));

    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, settings);

    const raw = JSON.parse(await fs.readFile(getWorkspaceSettingsPath(workspaceRoot), 'utf-8'));
    expect(raw.plugins).toEqual(expect.arrayContaining([
      expect.objectContaining({
        package: '@codegraphy-dev/plugin-markdown',
        futureMarkdownSetting: 'keep',
      }),
      { id: 'future.plugin', futureOnlyShape: true },
      3,
    ]));
  });

  it('drops representable raw plugins that the caller explicitly removes', async () => {
    const workspaceRoot = await createWorkspace();
    await fs.mkdir(path.dirname(getWorkspaceSettingsPath(workspaceRoot)), { recursive: true });
    await fs.writeFile(getWorkspaceSettingsPath(workspaceRoot), JSON.stringify({
      plugins: [
        { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, activation: 'enabled' },
        { id: 'future.plugin', futureOnlyShape: true },
        3,
      ],
    }));

    const settings = readCodeGraphyWorkspaceSettings(workspaceRoot);
    writeCodeGraphyWorkspaceSettings(workspaceRoot, { ...settings, plugins: [] });

    expect(JSON.parse(await fs.readFile(getWorkspaceSettingsPath(workspaceRoot), 'utf-8')).plugins).toEqual([
      { id: 'future.plugin', futureOnlyShape: true },
      3,
    ]);
  });

  it('returns defaults for non-object settings values', () => {
    const defaults = createDefaultCodeGraphyWorkspaceSettings();

    expect(normalizeCodeGraphyWorkspaceSettings(null)).toEqual(defaults);
    expect(normalizeCodeGraphyWorkspaceSettings([])).toEqual(defaults);
  });

  it('falls back to defaults for invalid scalar settings', () => {
    const defaults = createDefaultCodeGraphyWorkspaceSettings();

    expect(normalizeCodeGraphyWorkspaceSettings({
      maxFiles: Number.NaN,
      include: [42],
      respectGitignore: 'yes',
      showOrphans: 'no',
    })).toEqual(defaults);
  });

  it('normalizes supported scalar, array, and plugin settings', () => {
    expect(normalizeCodeGraphyWorkspaceSettings({
      version: 99,
      maxFiles: 25,
      include: ['src/**/*.ts', 42, 'packages/**/*.ts'],
      respectGitignore: false,
      showOrphans: false,
      filterPatterns: ['dist/**', 'dist/**', 7],
      disabledCustomFilterPatterns: ['generated/**', 'generated/**'],
      nodeVisibility: { file: true, 'symbol:function': false, invalid: 'yes' },
      edgeVisibility: { import: true, call: 'yes' },
      plugins: [
        {
          package: '  @codegraphy-dev/plugin-vue  ',
          disabledFilterPatterns: ['**/__pycache__/**', '**/__pycache__/**', false],
          options: { includeTests: true },
        },
        { package: '' },
        'plugin-string',
      ],
    })).toEqual({
      version: 1,
      maxFiles: 25,
      include: ['src/**/*.ts', 'packages/**/*.ts'],
      respectGitignore: false,
      showOrphans: false,
      filterPatterns: ['dist/**'],
      disabledCustomFilterPatterns: ['generated/**'],
      nodeVisibility: { file: true, 'symbol:function': false },
      edgeVisibility: { import: true },
      pluginData: {},
      plugins: [{
        id: '@codegraphy-dev/plugin-vue',
        activation: 'enabled',
        disabledFilterPatterns: ['**/__pycache__/**'],
        options: { includeTests: true },
      }],
    });
  });
});
