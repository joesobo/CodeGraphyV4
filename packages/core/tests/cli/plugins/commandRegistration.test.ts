import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runPluginsCommand } from '../../../src/cli/plugins/command';
import { readCodeGraphyInstalledPluginCache } from '../../../src';
import { createPackage } from './commandFixture';

describe('plugins/command registration', () => {
  it('registers an explicitly named globally installed plugin package without enabling it', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
      },
    }, {
      id: 'private-plugin',
    });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    }, {
      cwd: () => workspaceRoot,
      homeDir,
      resolveGlobalPackageRoots: () => [globalRoot],
    });

    expect(result).toEqual({
      exitCode: 0,
      output: 'Registered private-plugin in ~/.codegraphy/plugins.json.',
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins.map(plugin => plugin.package)).toEqual([
      'private-plugin',
    ]);
    await expect(fs.stat(path.join(workspaceRoot, '.codegraphy', 'settings.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('links a private local plugin package without requiring global npm install', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-private-package-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      `${JSON.stringify({
        name: '@acme/codegraphy-private-plugin',
        version: '0.1.0',
        codegraphy: {
          type: 'plugin',
          apiVersion: '^3.0.0',
        },
      }, null, 2)}\n`,
      'utf-8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'codegraphy.json'),
      `${JSON.stringify({
        id: 'acme.private',
        name: 'Acme Private',
      }, null, 2)}\n`,
      'utf-8',
    );

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'link',
      packageRoot,
    }, {
      cwd: () => workspaceRoot,
      homeDir,
    });

    expect(result).toEqual({
      exitCode: 0,
      output: `Linked @acme/codegraphy-private-plugin from ${packageRoot} into ~/.codegraphy/plugins.json.`,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([
      expect.objectContaining({
        package: '@acme/codegraphy-private-plugin',
        pluginId: 'acme.private',
        packageRoot,
      }),
    ]);
    await expect(fs.stat(path.join(workspaceRoot, '.codegraphy', 'settings.json'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('rejects plugin packages that do not declare a static plugin id', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
      },
    });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    }, {
      cwd: () => workspaceRoot,
      homeDir,
      resolveGlobalPackageRoots: () => [globalRoot],
    });

    expect(result).toEqual({
      exitCode: 1,
      output: "Package 'private-plugin' is missing codegraphy.json with a static plugin id.",
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([]);
  });
});
