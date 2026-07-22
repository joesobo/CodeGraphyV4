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
  it('reads optional package manifests and returns null for missing or non-plugin packages', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-vue', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
      },
    }, {
      id: 'codegraphy.vue',
      name: 'Vue',
      supportedExtensions: ['.vue'],
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
      },
    });
    await createPackage(packageRoot, '@codegraphy-dev/not-a-plugin', {
      version: '1.0.0',
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-vue');
    const nonPluginRoot = path.join(packageRoot, '@codegraphy-dev', 'not-a-plugin');

    await expect(readPackageManifest(pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^3.0.0',
      pluginId: 'codegraphy.vue',
      pluginName: 'Vue',
      supportedExtensions: ['.vue'],
      updateImpact: {
        toggle: 'reanalyze-plugin-files',
      },
      disclosures: [],
      packageRoot: pluginRoot,
      globallyEnabled: false,
    });
    await expect(readPackageManifest(nonPluginRoot)).resolves.toBeNull();
    await expect(readPackageManifest(path.join(pluginRoot, 'missing'))).resolves.toBeNull();
  });

  it('requires plugin packages to declare a static plugin id in codegraphy.json', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-missing-id', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
      },
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-missing-id');

    await expect(readPackageManifest(pluginRoot)).resolves.toBeNull();
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-missing-id', pluginRoot))
      .rejects.toThrow("Package '@codegraphy-dev/plugin-missing-id' is missing codegraphy.json with a static plugin id.");
  });

  it('requires a matching CodeGraphy plugin package manifest', async () => {
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-reader-'));
    await createPackage(packageRoot, '@codegraphy-dev/plugin-vue', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
        disclosures: ['network'],
      },
    }, {
      id: 'codegraphy.vue',
    });
    await createPackage(packageRoot, '@codegraphy-dev/not-a-plugin', {
      version: '1.0.0',
    });
    await createPackage(packageRoot, '@codegraphy-dev/plugin-ruby', {
      version: '1.2.3',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
      },
    }, {
      id: 'codegraphy.ruby',
    });
    const pluginRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-vue');
    const nonPluginRoot = path.join(packageRoot, '@codegraphy-dev', 'not-a-plugin');
    const mismatchedRoot = path.join(packageRoot, '@codegraphy-dev', 'plugin-ruby');

    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-vue', pluginRoot)).resolves.toEqual({
      package: '@codegraphy-dev/plugin-vue',
      version: '1.2.3',
      apiVersion: '^3.0.0',
      pluginId: 'codegraphy.vue',
      disclosures: ['network'],
      packageRoot: pluginRoot,
      globallyEnabled: false,
    });
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-vue', path.join(pluginRoot, 'missing')))
      .rejects.toThrow('Run `npm i -g @codegraphy-dev/plugin-vue` first.');
    await expect(readRequiredPackageManifest('@codegraphy-dev/not-a-plugin', nonPluginRoot))
      .rejects.toThrow("Package '@codegraphy-dev/not-a-plugin' is not a CodeGraphy plugin.");
    await expect(readRequiredPackageManifest('@codegraphy-dev/plugin-vue', mismatchedRoot))
      .rejects.toThrow("Package '@codegraphy-dev/plugin-vue' resolved to CodeGraphy plugin '@codegraphy-dev/plugin-ruby'.");
  });
});
