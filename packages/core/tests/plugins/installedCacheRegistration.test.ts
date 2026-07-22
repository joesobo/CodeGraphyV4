import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  linkCodeGraphyInstalledPluginPackage,
  readCodeGraphyInstalledPluginCache,
  registerCodeGraphyInstalledPlugin,
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
});
