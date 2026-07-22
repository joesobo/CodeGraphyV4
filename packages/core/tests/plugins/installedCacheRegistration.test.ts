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
  it('registers an explicitly named globally installed plugin package to the user-level registry', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const globalRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-global-root-'));
    await createPackage(globalRoot, 'private-plugin', {
      version: '4.5.6',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^3.0.0',
        disclosures: ['externalProcesses'],
      },
    }, {
      id: 'private-plugin',
    });

    const record = await registerCodeGraphyInstalledPlugin({
      homeDir,
      packageName: 'private-plugin',
      globalPackageRoots: [globalRoot],
    });

    expect(record).toEqual({
      package: 'private-plugin',
      version: '4.5.6',
      apiVersion: '^3.0.0',
      pluginId: 'private-plugin',
      disclosures: ['externalProcesses'],
      packageRoot: path.join(globalRoot, 'private-plugin'),
      globallyEnabled: false,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([record]);
  });

  it('links a private local plugin package root into the user-level cache', async () => {
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-user-home-'));
    const packageRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-private-package-'));
    await fs.writeFile(
      path.join(packageRoot, 'package.json'),
      `${JSON.stringify({
        name: '@acme/codegraphy-private-plugin',
        version: '0.1.0',
        codegraphy: {
          type: 'plugin',
          apiVersion: '^3.0.0',
          disclosures: ['workspaceWrites'],
        },
      }, null, 2)}\n`,
      'utf-8',
    );
    await fs.writeFile(
      path.join(packageRoot, 'codegraphy.json'),
      `${JSON.stringify({
        id: 'acme.private',
        name: 'Acme Private',
        supportedExtensions: ['.acme'],
      }, null, 2)}\n`,
      'utf-8',
    );

    const record = await linkCodeGraphyInstalledPluginPackage({
      homeDir,
      packageRoot,
    });

    expect(record).toEqual({
      package: '@acme/codegraphy-private-plugin',
      version: '0.1.0',
      apiVersion: '^3.0.0',
      pluginId: 'acme.private',
      pluginName: 'Acme Private',
      supportedExtensions: ['.acme'],
      disclosures: ['workspaceWrites'],
      packageRoot,
      globallyEnabled: false,
    });
    expect(readCodeGraphyInstalledPluginCache({ homeDir }).plugins).toEqual([record]);
  });
});
