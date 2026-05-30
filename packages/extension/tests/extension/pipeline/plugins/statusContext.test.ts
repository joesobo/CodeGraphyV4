import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  getWorkspaceSettingsPath,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readWorkspacePluginStatusContext } from '../../../../src/extension/pipeline/plugins/statusContext';
import { getWorkspacePipelineStatusList } from '../../../../src/extension/pipeline/service/runtime/plugins';

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
            package: '@codegraphy-dev/plugin-python',
            version: '2.0.0',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-python',
          },
          {
            package: '@codegraphy-dev/plugin-godot',
            version: '3.0.0',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-godot',
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
      plugins: [{ package: '@codegraphy-dev/plugin-python' }],
    });

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(statusContext.installedPlugins.map(plugin => plugin.package)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy-dev/plugin-python',
      '@codegraphy-dev/plugin-godot',
    ]);
    expect(statusContext.workspaceEnabledPackageNames?.has('@codegraphy-dev/plugin-python')).toBe(true);
    expect(statusContext.workspaceEnabledPackageNames?.has('@codegraphy-dev/plugin-godot')).toBe(false);
  });

  it('does not materialize workspace settings when the workspace has no settings file yet', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 1,
        plugins: [
          {
            package: '@codegraphy-dev/plugin-python',
            version: '2.0.0',
            apiVersion: '^2.0.0',
            disclosures: [],
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-python',
          },
        ],
      },
      { homeDir },
    );

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(statusContext.installedPlugins.map(plugin => plugin.package)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy-dev/plugin-python',
    ]);
    expect(statusContext.workspaceEnabledPackageNames).toBeUndefined();
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

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(statusContext.installedPlugins.map(plugin => plugin.package)).toContain(
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    );
    expect(statusContext.workspaceEnabledPackageNames?.has(CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME)).toBe(false);
  });

  it('includes enabled workspace plugin packages even when they are missing from the installed cache', () => {
    writeCodeGraphyInstalledPluginCache({ version: 1, plugins: [] }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [
        { package: '@codegraphy-dev/plugin-python' },
        { package: '@codegraphy-dev/plugin-csharp' },
      ],
    });

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(statusContext.installedPlugins.map(plugin => plugin.package)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy-dev/plugin-python',
      '@codegraphy-dev/plugin-csharp',
    ]);
    expect(statusContext.workspaceEnabledPackageNames).toEqual(new Set([
      '@codegraphy-dev/plugin-python',
      '@codegraphy-dev/plugin-csharp',
    ]));
    expect(
      getWorkspacePipelineStatusList(
        {
          list: () => [],
        } as never,
        new Set(),
        [],
        new Map(),
        statusContext,
      ),
    ).toEqual([
      expect.objectContaining({
        packageName: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
        enabled: false,
      }),
      expect.objectContaining({
        packageName: '@codegraphy-dev/plugin-python',
        enabled: true,
        status: 'unavailable',
      }),
      expect.objectContaining({
        packageName: '@codegraphy-dev/plugin-csharp',
        enabled: true,
        status: 'unavailable',
      }),
    ]);
  });
});
