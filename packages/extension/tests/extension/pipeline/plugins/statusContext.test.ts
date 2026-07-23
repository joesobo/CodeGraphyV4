import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
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

  it('reads the user installed plugin cache and workspace enabled plugin IDs', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 3,
        plugins: [
          {
            package: '@codegraphy-dev/plugin-vue',
            version: '2.0.0',
            id: 'codegraphy.vue',
            host: 'core',
            entry: './dist/plugin.js',
            apiVersion: '^4.0.0',
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-vue',
            globallyEnabled: false,
          },
          {
            package: '@codegraphy-dev/plugin-godot',
            version: '3.0.0',
            id: 'codegraphy.godot',
            host: 'core',
            entry: './dist/plugin.js',
            apiVersion: '^4.0.0',
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-godot',
            globallyEnabled: false,
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
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [{ id: 'codegraphy.vue', activation: 'enabled' }],
      interfaces: [],
    });

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(statusContext.installedPlugins.map(plugin => plugin.package)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy-dev/plugin-vue',
      '@codegraphy-dev/plugin-godot',
    ]);
    expect(statusContext.workspaceEnabledPluginIds?.has('codegraphy.vue')).toBe(true);
    expect(statusContext.workspaceEnabledPluginIds?.has('codegraphy.godot')).toBe(false);
  });

  it('lists disabled plugins bundled with the Extension as installed', () => {
    const bundledPackageRoot = path.join(tempRoot, 'extension', 'packages', 'plugin-particles');
    fs.mkdirSync(bundledPackageRoot, { recursive: true });
    fs.writeFileSync(path.join(bundledPackageRoot, 'package.json'), JSON.stringify({
      name: '@codegraphy-dev/plugin-particles',
      version: '0.2.4',
      codegraphy: {
        plugins: [{
          id: 'codegraphy.particles',
          name: 'Particles',
          host: 'codegraphy.extension',
          entry: './dist/plugin.js',
          apiVersion: '^1.0.0',
        }],
      },
    }));
    writeCodeGraphyInstalledPluginCache({ version: 3, plugins: [] }, { homeDir });

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, {
      homeDir,
      bundledPackageRoots: [bundledPackageRoot],
    });

    expect(statusContext.installedPlugins).toContainEqual(expect.objectContaining({
      id: 'codegraphy.particles',
      package: '@codegraphy-dev/plugin-particles',
      globallyEnabled: false,
    }));
    expect(statusContext.workspaceEnabledPluginIds?.has('codegraphy.particles')).toBe(false);
  });

  it('uses initial Markdown activity state without materializing workspace settings', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 3,
        plugins: [
          {
            package: '@codegraphy-dev/plugin-vue',
            version: '2.0.0',
            id: 'codegraphy.vue',
            host: 'core',
            entry: './dist/plugin.js',
            apiVersion: '^4.0.0',
            packageRoot: '/global/node_modules/@codegraphy-dev/plugin-vue',
            globallyEnabled: false,
          },
        ],
      },
      { homeDir },
    );

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(statusContext.installedPlugins.map(plugin => plugin.package)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy-dev/plugin-vue',
    ]);
    expect(statusContext.workspaceEnabledPluginIds?.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID)).toBe(true);
    expect(statusContext.workspaceEnabledPluginIds?.has('codegraphy.vue')).toBe(false);
    expect(fs.existsSync(getWorkspaceSettingsPath(workspaceRoot))).toBe(false);
  });

  it('uses global defaults for missing and inherited workspace activation', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 3,
        plugins: [
          {
            package: '@acme/global-on',
            version: '1.0.0',
            id: 'acme.global-on',
            host: 'codegraphy.extension',
            entry: './plugin.js',
            apiVersion: '^1.0.0',
            packageRoot: '/global/node_modules/@acme/global-on',
            globallyEnabled: true,
          },
          {
            package: '@acme/global-off',
            version: '1.0.0',
            id: 'acme.global-off',
            host: 'codegraphy.extension',
            entry: './plugin.js',
            apiVersion: '^1.0.0',
            packageRoot: '/global/node_modules/@acme/global-off',
            globallyEnabled: false,
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
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [{ id: 'acme.global-off', activation: 'inherit' }],
      interfaces: [],
    });

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect([...statusContext.workspaceEnabledPluginIds ?? []]).toContain('acme.global-on');
    expect([...statusContext.workspaceEnabledPluginIds ?? []]).not.toContain('acme.global-off');
  });

  it('reports global activation when no workspace is open', () => {
    writeCodeGraphyInstalledPluginCache(
      {
        version: 3,
        plugins: [
          {
            package: '@acme/global-on',
            version: '1.0.0',
            id: 'acme.global-on',
            host: 'codegraphy.extension',
            entry: './plugin.js',
            apiVersion: '^1.0.0',
            packageRoot: '/global/node_modules/@acme/global-on',
            globallyEnabled: true,
          },
          {
            package: '@acme/global-off',
            version: '1.0.0',
            id: 'acme.global-off',
            host: 'codegraphy.extension',
            entry: './plugin.js',
            apiVersion: '^1.0.0',
            packageRoot: '/global/node_modules/@acme/global-off',
            globallyEnabled: false,
          },
        ],
      },
      { homeDir },
    );

    const statusContext = readWorkspacePluginStatusContext(undefined, { homeDir });

    expect([...statusContext.workspaceEnabledPluginIds ?? []]).toContain('acme.global-on');
    expect([...statusContext.workspaceEnabledPluginIds ?? []]).not.toContain('acme.global-off');
  });

  it('uses the bundled Markdown global default when workspace settings omit it', () => {
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [],
      interfaces: [],
    });

    const statusContext = readWorkspacePluginStatusContext(workspaceRoot, { homeDir });

    expect(statusContext.installedPlugins.map(plugin => plugin.package)).toContain(
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    );
    expect(statusContext.workspaceEnabledPluginIds?.has(CODEGRAPHY_MARKDOWN_PLUGIN_ID)).toBe(true);
  });
});
