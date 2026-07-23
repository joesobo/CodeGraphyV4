import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import { runPluginsCommand } from '../../../src/cli/plugins/command';
import { readCodeGraphyInstalledPluginCache } from '../../../src';
import { createPackage } from './commandFixture';

describe('plugins/command registration', () => {
  it('registers all plugins in a global package without enabling them', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        plugins: [
          { id: 'private.core', host: 'core', entry: './core.js', apiVersion: '^4.0.0' },
          { id: 'private.ui', host: 'acme.ui', entry: './ui.js', apiVersion: '^1.0.0' },
        ],
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
      exitCode: 0,
      output: 'Registered 2 plugins from private-plugin in ~/.codegraphy/plugins.json.',
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins.map(plugin => plugin.id))
      .toEqual(['private.core', 'private.ui']);
    await expect(fs.stat(path.join(workspaceRoot, '.codegraphy', 'settings.json')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('links a private local plugin package without a global npm install', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-private-package-'));
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-workspace-'));
    await fs.writeFile(path.join(packageRoot, 'package.json'), `${JSON.stringify({
      name: '@acme/codegraphy-private-plugin',
      version: '0.1.0',
      codegraphy: {
        plugins: [{
          id: 'acme.private',
          host: 'codegraphy.extension',
          entry: './dist/plugin.js',
          apiVersion: '^1.0.0',
        }],
      },
    }, null, 2)}\n`, 'utf-8');

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'link',
      packageRoot,
    }, { cwd: () => workspaceRoot, homeDir });

    expect(result).toEqual({
      exitCode: 0,
      output: `Linked 1 plugin from ${packageRoot} into ~/.codegraphy/plugins.json.`,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([
      expect.objectContaining({
        package: '@acme/codegraphy-private-plugin',
        id: 'acme.private',
        host: 'codegraphy.extension',
        packageRoot,
      }),
    ]);
  });

  it('rejects packages without plugin descriptors', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    await createPackage(globalRoot, 'private-plugin', { version: '4.5.6' });

    const result = await runPluginsCommand({
      name: 'plugins',
      action: 'register',
      packageName: 'private-plugin',
    }, {
      cwd: () => '/workspace',
      homeDir,
      resolveGlobalPackageRoots: () => [globalRoot],
    });

    expect(result).toEqual({
      exitCode: 1,
      output: "Package 'private-plugin' is not a CodeGraphy plugin.",
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([]);
  });
});
