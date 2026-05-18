import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  readCodeGraphyInstalledPluginCache,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  type CodeGraphyInstalledPluginRecord,
} from '@codegraphy/core';
import { describe, expect, it } from 'vitest';

import { runPluginsCommand } from '../../src/plugins/command';

async function createPackage(
  root: string,
  packageName: string,
  packageJson: Record<string, unknown>,
): Promise<void> {
  const packageRoot = path.join(root, ...packageName.split('/'));
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({ name: packageName, ...packageJson }, null, 2)}\n`,
    'utf-8',
  );
}

function createPluginRecord(
  packageName: string,
  packageRoot: string,
): CodeGraphyInstalledPluginRecord {
  return {
    package: packageName,
    version: '1.2.3',
    apiVersion: '^2.0.0',
    disclosures: [],
    defaultOptions: { includeTests: true },
    packageRoot,
  };
}

describe('plugins/command', () => {
  it('refreshes global CodeGraphy plugin packages without enabling a workspace plugin', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await createPackage(globalRoot, '@codegraphy/plugin-python', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'refresh',
    }, {
      cwd: () => workspaceRoot,
      homeDir,
      resolveGlobalPackageRoots: () => [globalRoot],
    });

    expect(result).toEqual({
      exitCode: 0,
      output: 'Refreshed 1 CodeGraphy plugin in ~/.codegraphy/plugins.json.',
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins.map(plugin => plugin.package)).toEqual([
      '@codegraphy/plugin-python',
    ]);
    await expect(fs.stat(path.join(workspaceRoot, '.codegraphy', 'settings.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('adds an explicitly named globally installed plugin package', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'add',
      packageName: 'private-plugin',
    }, {
      homeDir,
      resolveGlobalPackageRoots: () => [globalRoot],
    });

    expect(result).toEqual({
      exitCode: 0,
      output: 'Added private-plugin to ~/.codegraphy/plugins.json.',
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins.map(plugin => plugin.package)).toEqual([
      'private-plugin',
    ]);
  });

  it('enables and disables a cached plugin for one workspace', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    const record = createPluginRecord('@codegraphy/plugin-python', '/global/@codegraphy/plugin-python');
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [record],
    }, { homeDir });

    const enableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy/plugin-python',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(enableResult).toEqual({
      exitCode: 0,
      output: `Enabled @codegraphy/plugin-python for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([
      { package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME },
      {
        package: '@codegraphy/plugin-python',
        options: { includeTests: true },
      },
    ]);

    const disableResult = await runPluginsCommand({
      name: 'plugins',
      action: 'disable',
      packageName: '@codegraphy/plugin-python',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(disableResult).toEqual({
      exitCode: 0,
      output: `Disabled @codegraphy/plugin-python for ${workspaceRoot}. Run \`codegraphy index ${workspaceRoot}\` to refresh the Graph Cache.`,
    });
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).plugins).toEqual([{
      package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
    }]);
  });

  it('lists enabled workspace plugins separately from installed disabled plugins', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-plugin-'));
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [
        createPluginRecord('@codegraphy/plugin-markdown', '/global/@codegraphy/plugin-markdown'),
        createPluginRecord('@codegraphy/plugin-python', '/global/@codegraphy/plugin-python'),
      ],
    }, { homeDir });
    await runPluginsCommand({
      name: 'plugins',
      action: 'enable',
      packageName: '@codegraphy/plugin-python',
      workspacePath: workspaceRoot,
    }, { homeDir });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'list',
      workspacePath: workspaceRoot,
    }, { homeDir });

    expect(result.output).toContain(`CodeGraphy plugins for ${workspaceRoot}`);
    expect(result.output).toContain('Enabled in workspace:');
    expect(result.output).toContain('1. @codegraphy/plugin-markdown');
    expect(result.output).toContain('2. @codegraphy/plugin-python');
    expect(result.output).toContain('Installed but disabled:');
    expect(result.output).not.toContain('- @codegraphy/plugin-markdown');
  });
});
