import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  readPackageManifest,
  readRequiredPackageManifest,
} from '../../src/plugins/installedPluginCache/packageReader';
import { createPackage } from './installedCacheFixture';

describe('CodeGraphy installed plugin package manifests', () => {
  it('reads every plugin descriptor without interpreting its host', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@acme/codegraphy-tools', {
      version: '1.2.3',
      codegraphy: {
        plugins: [
          {
            id: 'acme.analysis',
            name: 'Acme Analysis',
            host: 'core',
            entry: './dist/core.js',
            apiVersion: '^4.0.0',
          },
          {
            id: 'acme.interface',
            host: 'acme.webview',
            entry: './dist/webview.js',
            apiVersion: '^27.0.0',
          },
        ],
      },
    });
    const pluginRoot = path.join(packageRoot, '@acme', 'codegraphy-tools');

    await expect(readPackageManifest(pluginRoot)).resolves.toEqual([
      {
        package: '@acme/codegraphy-tools',
        version: '1.2.3',
        packageRoot: pluginRoot,
        globallyEnabled: false,
        id: 'acme.analysis',
        name: 'Acme Analysis',
        host: 'core',
        entry: './dist/core.js',
        apiVersion: '^4.0.0',
      },
      {
        package: '@acme/codegraphy-tools',
        version: '1.2.3',
        packageRoot: pluginRoot,
        globallyEnabled: false,
        id: 'acme.interface',
        host: 'acme.webview',
        entry: './dist/webview.js',
        apiVersion: '^27.0.0',
      },
    ]);
    await expect(readPackageManifest(path.join(pluginRoot, 'missing'))).resolves.toBeNull();
  });

  it('returns null for packages without valid plugin descriptors', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@acme/not-a-plugin', { version: '1.0.0' });
    await createPackage(packageRoot, '@acme/duplicate-plugin', {
      version: '1.0.0',
      codegraphy: {
        plugins: [
          { id: 'acme.same', host: 'core', entry: './one.js', apiVersion: '^4.0.0' },
          { id: 'acme.same', host: 'other', entry: './two.js', apiVersion: '^1.0.0' },
        ],
      },
    });

    await expect(readPackageManifest(path.join(packageRoot, '@acme', 'not-a-plugin')))
      .resolves.toBeNull();
    await expect(readPackageManifest(path.join(packageRoot, '@acme', 'duplicate-plugin')))
      .resolves.toBeNull();
  });

  it('requires the resolved package name to match', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@acme/codegraphy-ruby', {
      version: '1.2.3',
      codegraphy: {
        plugins: [{
          id: 'acme.ruby',
          host: 'core',
          entry: './dist/plugin.js',
          apiVersion: '^4.0.0',
        }],
      },
    });
    const pluginRoot = path.join(packageRoot, '@acme', 'codegraphy-ruby');

    await expect(readRequiredPackageManifest('@acme/codegraphy-ruby', pluginRoot))
      .resolves.toHaveLength(1);
    await expect(readRequiredPackageManifest('@acme/codegraphy-ruby', path.join(pluginRoot, 'missing')))
      .rejects.toThrow('Run `npm i -g @acme/codegraphy-ruby` first.');
    await expect(readRequiredPackageManifest('@acme/not-ruby', pluginRoot))
      .rejects.toThrow("Package '@acme/not-ruby' resolved to CodeGraphy plugin package '@acme/codegraphy-ruby'.");
  });
});
