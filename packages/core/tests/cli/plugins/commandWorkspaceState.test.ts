import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
} from '../../../src';
import { runPluginsCommand } from '../../../src/cli/plugins/command';
import { createPluginRecord } from './commandFixture';

describe('plugins/command workspace state', () => {
  it('preserves unknown keys inside an existing plugin entry', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-lossless-'));
    const record = createPluginRecord('@codegraphy-dev/plugin-vue', '/global/plugin-vue', 'codegraphy.vue');
    writeCodeGraphyInstalledPluginCache({ version: 3, plugins: [record] }, { homeDir });
    await fs.mkdir(path.join(workspaceRoot, '.codegraphy'));
    await fs.writeFile(path.join(workspaceRoot, '.codegraphy/settings.json'), JSON.stringify({
      version: 3,
      plugins: [{
        id: 'codegraphy.vue',
        activation: 'disabled',
        futurePluginSetting: { mode: 'fast' },
      }],
    }));

    await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: 'codegraphy.vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    const raw = JSON.parse(await fs.readFile(path.join(workspaceRoot, '.codegraphy/settings.json'), 'utf-8'));
    expect(raw.plugins).toEqual([expect.objectContaining({
      id: 'codegraphy.vue',
      activation: 'enabled',
      futurePluginSetting: { mode: 'fast' },
    })]);
  });

  it('enables and disables a cached plugin for one workspace', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    const record = createPluginRecord(
      '@codegraphy-dev/plugin-vue',
      '/global/@codegraphy-dev/plugin-vue',
      'codegraphy.vue',
    );
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [record],
    }, { homeDir });

    const enableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(enableResult).toEqual({
      exitCode: 0,
      output: `Enabled codegraphy.vue for ${workspaceRoot}. Run \`codegraphy -C "${workspaceRoot}" index\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, activation: 'inherit' },
      { id: 'codegraphy.vue', activation: 'enabled' },
    ]);

    const disableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(disableResult).toEqual({
      exitCode: 0,
      output: `Disabled codegraphy.vue for ${workspaceRoot}. Run \`codegraphy -C "${workspaceRoot}" index\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, activation: 'inherit' },
      { id: 'codegraphy.vue', activation: 'disabled' },
    ]);
  });

  it('enables bundled Markdown without requiring it in the user installed plugin cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-markdown-'));

    const disableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      workspacePath: workspaceRoot,
    }, { homeDir });
    expect(disableResult.exitCode).toBe(0);
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      activation: 'disabled',
    }]);

    const enableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(enableResult).toEqual({
      exitCode: 0,
      output: `Enabled ${CODEGRAPHY_MARKDOWN_PLUGIN_ID} for ${workspaceRoot}. Run \`codegraphy -C "${workspaceRoot}" index\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
      activation: 'enabled',
    }]);
  });

  it('stores a global default for bundled Markdown without prior registration', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      pluginScope: 'global',
    }, { homeDir });

    expect(result).toEqual({
      exitCode: 0,
      output: `Disabled ${CODEGRAPHY_MARKDOWN_PLUGIN_ID} globally.`,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([
      expect.objectContaining({
        id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
        globallyEnabled: false,
      }),
    ]);
  });

  it('returns structured plugin activity for automation', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-list-'));
    const vue = createPluginRecord(
      '@codegraphy-dev/plugin-vue',
      '/global/@codegraphy-dev/plugin-vue',
      'codegraphy.vue',
    );
    writeCodeGraphyInstalledPluginCache({ version: 3, plugins: [vue] }, { homeDir });
    await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: 'codegraphy.vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(JSON.parse(result.output)).toEqual({
      workspaceRoot,
      plugins: [
        {
          id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
          package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
          host: 'core',
          globallyEnabled: true,
          workspaceActivation: 'inherit',
          state: 'active',
        },
        {
          id: 'codegraphy.vue',
          package: '@codegraphy-dev/plugin-vue',
          host: 'core',
          globallyEnabled: false,
          workspaceActivation: 'enabled',
          state: 'active',
        },
      ],
      warnings: [],
    });
  });

  it('lists disabled bundled Markdown without requiring it in the user installed plugin cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-markdown-'));

    await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      workspacePath: workspaceRoot,
    }, { homeDir });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(JSON.parse(result.output)).toMatchObject({
      plugins: [{
        id: CODEGRAPHY_MARKDOWN_PLUGIN_ID,
        workspaceActivation: 'disabled',
        state: 'disabled',
      }],
      warnings: [],
    });
  });

  it('lists enabled workspace plugins separately from registered disabled plugins', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [
        {
          ...createPluginRecord(
            '@codegraphy-dev/plugin-markdown',
            '/global/@codegraphy-dev/plugin-markdown',
            CODEGRAPHY_MARKDOWN_PLUGIN_ID,
          ),
          globallyEnabled: true,
        },
        createPluginRecord(
          '@codegraphy-dev/plugin-vue',
          '/global/@codegraphy-dev/plugin-vue',
          'codegraphy.vue',
        ),
      ],
    }, { homeDir });
    await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy-dev/plugin-vue',
      workspacePath: workspaceRoot,
    }, { homeDir });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(JSON.parse(result.output)).toMatchObject({
      workspaceRoot,
      plugins: [
        { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, state: 'active' },
        { id: 'codegraphy.vue', state: 'active' },
      ],
      warnings: [],
    });
  });

  it('lists enabled conflicting descriptors as unavailable instead of disabled', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    const first = createPluginRecord('@acme/plugin-one', '/global/plugin-one', 'acme.conflict');
    const second = createPluginRecord('@acme/plugin-two', '/global/plugin-two', 'acme.conflict');
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [first, second],
    }, { homeDir });
    await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: 'acme.conflict',
      workspacePath: workspaceRoot,
    }, { homeDir });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: workspaceRoot,
    }, { homeDir });

    const output = JSON.parse(result.output);
    expect(output.plugins).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'acme.conflict',
        package: '@acme/plugin-one',
        state: 'enabled-unavailable',
      }),
      expect.objectContaining({
        id: 'acme.conflict',
        package: '@acme/plugin-two',
        state: 'enabled-unavailable',
      }),
    ]));
    expect(output.warnings).toEqual([
      expect.stringContaining("CodeGraphy plugin 'acme.conflict' is enabled but multiple installed packages claim it"),
    ]);
  });
});
