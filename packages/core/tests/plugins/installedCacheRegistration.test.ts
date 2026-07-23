import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  linkCodeGraphyInstalledPluginPackage,
  readCodeGraphyInstalledPluginCache,
  registerCodeGraphyInstalledPlugin,
  setCodeGraphyInstalledPluginGlobalActivation,
} from '../../src';
import { createPackage } from './installedCacheFixture';

describe('CodeGraphy installed plugin registration', () => {
  it('registers every descriptor from one globally installed package as disabled', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        plugins: [
          { id: 'private.core', host: 'core', entry: './core.js', apiVersion: '^4.0.0' },
          { id: 'private.ui', host: 'acme.ui', entry: './ui.js', apiVersion: '^2.0.0' },
        ],
      },
    });

    const records = await registerCodeGraphyInstalledPlugin({
      homeDir,
      packageName: 'private-plugin',
      globalPackageRoots: [globalRoot],
    });

    expect(records.map(record => record.id)).toEqual(['private.core', 'private.ui']);
    expect(records.every(record => !record.globallyEnabled)).toBe(true);
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual(records);
  });

  it('links a private local plugin package root into the user registry', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-private-package-'));
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      `${JSON.stringify({
        name: '@acme/codegraphy-private-plugin',
        version: '0.1.0',
        codegraphy: {
          plugins: [{
            id: 'acme.private',
            name: 'Acme Private',
            host: 'codegraphy.extension',
            entry: './dist/plugin.js',
            apiVersion: '^1.0.0',
          }],
        },
      }, null, 2)}\n`,
      'utf-8',
    );

    const [record] = await linkCodeGraphyInstalledPluginPackage({ homeDir, packageRoot });

    expect(record).toEqual({
      package: '@acme/codegraphy-private-plugin',
      version: '0.1.0',
      id: 'acme.private',
      name: 'Acme Private',
      host: 'codegraphy.extension',
      entry: './dist/plugin.js',
      apiVersion: '^1.0.0',
      packageRoot,
      globallyEnabled: false,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([record]);
  });

  it('stores a linked package root as an absolute path', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-relative-package-'));
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      `${JSON.stringify({
        name: '@acme/codegraphy-relative-plugin',
        version: '0.1.0',
        codegraphy: {
          plugins: [{
            id: 'acme.relative',
            host: 'core',
            entry: './plugin.js',
            apiVersion: '^4.0.0',
          }],
        },
      }, null, 2)}\n`,
      'utf-8',
    );
    const relativePackageRoot = path.relative(process.cwd(), packageRoot);

    const [record] = await linkCodeGraphyInstalledPluginPackage({
      homeDir,
      packageRoot: relativePackageRoot,
    });

    expect(record.packageRoot).toBe(packageRoot);
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins[0]?.packageRoot)
      .toBe(packageRoot);
  });

  it('does not inherit global activation from a different package with the same plugin id', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    const descriptor = {
      version: '1.0.0',
      codegraphy: {
        plugins: [{
          id: 'acme.shared',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
        }],
      },
    };
    await createPackage(globalRoot, '@acme/first', descriptor);
    await createPackage(globalRoot, '@acme/second', descriptor);

    const [first] = await registerCodeGraphyInstalledPlugin({
      homeDir,
      packageName: '@acme/first',
      globalPackageRoots: [globalRoot],
    });
    setCodeGraphyInstalledPluginGlobalActivation(first, true, { homeDir });
    await registerCodeGraphyInstalledPlugin({
      homeDir,
      packageName: '@acme/second',
      globalPackageRoots: [globalRoot],
    });

    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([
      expect.objectContaining({
        package: '@acme/first',
        id: 'acme.shared',
        globallyEnabled: true,
      }),
      expect.objectContaining({
        package: '@acme/second',
        id: 'acme.shared',
        globallyEnabled: false,
      }),
    ]);
  });
});
