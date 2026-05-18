import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  getWorkspaceSettingsPath,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy/core';
import { readWorkspacePluginStatusContext } from '../../../../src/extension/pipeline/plugins/statusContext';

describe('pipeline/plugins/statusContext', () => {
  let tempRoot: string;
  let homeDir: string;
  let workspaceRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-plugin-status-'));
    homeDir = path.join(tempRoot, 'home');
    workspaceRoot = path.join(tempRoot, 'workspace');
    fs.mkdirSync(workspaceRoot, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('reads the user installed plugin cache and workspace enabled plugin packages', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy/plugin-python',
            version: '2.0.0',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy/plugin-python',
          },
          {
            package: '@codegraphy/plugin-godot',
            version: '3.0.0',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy/plugin-godot',
          },
        ],
      },
      { homeDir },
    );
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [{ package: '@codegraphy/plugin-python' }],
    });

    const context = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(context.installedPlugins.map(plugin => plugin.package)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy/plugin-python',
      '@codegraphy/plugin-godot',
    ]);
    expect(context.workspaceEnabledPackageNames?.has('@codegraphy/plugin-python')).toBe(true);
    expect(context.workspaceEnabledPackageNames?.has('@codegraphy/plugin-godot')).toBe(false);
  });

  it('does not materialize workspace settings when the workspace has no settings file yet', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy/plugin-python',
            version: '2.0.0',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy/plugin-python',
          },
        ],
      },
      { homeDir },
    );

    const context = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(context.installedPlugins.map(plugin => plugin.package)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy/plugin-python',
    ]);
    expect(context.workspaceEnabledPackageNames).toBeUndefined();
    expect(fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))).toBe(false);
  });

  it('includes bundled Markdown as an installed disabled plugin when workspace settings remove it', () => {
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [],
    });

    const context = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(context.installedPlugins.map(plugin => plugin.package)).toContain(
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    );
    expect(context.workspaceEnabledPackageNames?.has(CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)).toBe(false);
  });
});
