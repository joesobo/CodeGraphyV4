import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  readBundledWorkspacePluginPackageRecords,
  readBundledWorkspacePluginPackageRoots,
} from '../../../../src/extension/pipeline/plugins/bootstrap/bundledPackages';

const BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV = 'CODEGRAPHY_BUNDLED_PLUGIN_PACKAGE_ROOTS';
const previousBundledRoots = process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV];

afterEach(() => {
  if (previousBundledRoots === undefined) {
    delete process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV];
  } else {
    process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV] = previousBundledRoots;
  }
});

describe('extension/pipeline/plugins/bootstrap/bundledPackages', () => {
  it('uses explicit bundled package roots when the environment override is set', async () => {
    process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV] = [
      '/plugins/vue',
      '',
      '/plugins/unity',
    ].join(path.delimiter);

    await expect(readBundledWorkspacePluginPackageRoots('/repo/packages/extension')).resolves.toEqual([
      '/plugins/vue',
      '/plugins/unity',
    ]);
  });

  it('allows tests to disable bundled package scanning with an empty override', async () => {
    const extensionRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-bundled-packages-'));
    await fs.mkdir(path.join(extensionRoot, 'packages', 'plugin-unity'), { recursive: true });
    process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV] = '';

    await expect(readBundledWorkspacePluginPackageRoots(extensionRoot)).resolves.toEqual([]);
  });

  it('scans packaged extension package directories when no override is set', async () => {
    delete process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV];
    const extensionRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-bundled-packages-'));
    const pluginRoot = path.join(extensionRoot, 'packages', 'plugin-unity');
    await fs.mkdir(pluginRoot, { recursive: true });

    await expect(readBundledWorkspacePluginPackageRoots(extensionRoot)).resolves.toEqual([pluginRoot]);
  });

  it('reads every descriptor from packaged plugin manifests', async () => {
    delete process.env[BUNDLED_PLUGIN_PACKAGE_ROOTS_ENV];
    const extensionRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-bundled-packages-'));
    const pluginRoot = path.join(extensionRoot, 'packages', 'plugin-multi');
    await fs.mkdir(pluginRoot, { recursive: true });
    await fs.writeFile(path.join(pluginRoot, 'package.json'), JSON.stringify({
      name: '@acme/plugin-multi',
      version: '1.2.3',
      codegraphy: {
        plugins: [
          { id: 'acme.core', host: 'core', entry: './core.js', apiVersion: '^4.0.0' },
          { id: 'acme.extension', host: 'codegraphy.extension', entry: './extension.js', apiVersion: '^1.0.0' },
        ],
      },
    }));

    expect(readBundledWorkspacePluginPackageRecords(extensionRoot)).toEqual([
      expect.objectContaining({
        id: 'acme.core',
        package: '@acme/plugin-multi',
        packageRoot: pluginRoot,
        globallyEnabled: false,
      }),
      expect.objectContaining({
        id: 'acme.extension',
        package: '@acme/plugin-multi',
        packageRoot: pluginRoot,
        globallyEnabled: false,
      }),
    ]);
  });
});
