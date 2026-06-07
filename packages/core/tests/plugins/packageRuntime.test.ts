import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  loadCodeGraphyWorkspacePluginPackages,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '../../src';

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-workspace-'));
}

async function createPluginPackage(packageRoot: string): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: '@acme/codegraphy-plugin-data-host',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
        defaultOptions: {
          marker: 'from-default-options',
        },
      },
    }, null, 2)}\n`,
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin(factoryOptions = {}) {
  const dataHost = factoryOptions.dataHost;
  const marker = factoryOptions.options?.marker ?? 'missing-options';

  return {
    id: 'acme.data-host',
    name: 'Data Host Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: [],
    async initialize() {
      if (!dataHost) {
        throw new Error('Expected factory dataHost.');
      }
      await dataHost.saveData({ marker });
    }
  };
}
`,
    'utf-8',
  );
}

async function createPluginPackageWithRuntimeMarkers(packageRoot: string): Promise<{
  factoryMarkerPath: string;
  importMarkerPath: string;
}> {
  const importMarkerPath = path.join(packageRoot, 'runtime-imported.txt');
  const factoryMarkerPath = path.join(packageRoot, 'factory-called.txt');

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: '@acme/codegraphy-plugin-disabled-runtime',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
      },
    }, null, 2)}\n`,
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
import { writeFileSync } from 'node:fs';

writeFileSync(${JSON.stringify(importMarkerPath)}, 'imported');

export default function createPlugin() {
  writeFileSync(${JSON.stringify(factoryMarkerPath)}, 'factory called');
  return {
    id: 'acme.disabled-runtime',
    name: 'Disabled Runtime Plugin',
    version: '1.0.0',
    apiVersion: '^2.0.0',
    supportedExtensions: ['.disabled']
  };
}
`,
    'utf-8',
  );

  return { factoryMarkerPath, importMarkerPath };
}

describe('CodeGraphy package runtime', () => {
  it('passes workspace plugin data host and options to package plugin factories', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-package-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-data-host',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-data-host',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: ['workspaceWrites'],
        packageRoot,
        defaultOptions: {
          marker: 'from-default-options',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: '@acme/codegraphy-plugin-data-host',
        options: {
          marker: 'from-workspace-options',
        },
      }],
    });

    const [loadedPlugin] = await loadCodeGraphyWorkspacePluginPackages({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
    });

    await loadedPlugin?.plugin.initialize?.(workspaceRoot);

    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).pluginData).toEqual({
      'acme.data-host': {
        marker: 'from-workspace-options',
      },
    });
  });

  it('leaves disabled installed package runtimes unloaded while retaining static metadata', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-package-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-disabled-runtime',
    );
    const { factoryMarkerPath, importMarkerPath } = await createPluginPackageWithRuntimeMarkers(packageRoot);

    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-disabled-runtime',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.disabled-runtime',
        pluginName: 'Disabled Runtime Plugin',
        supportedExtensions: ['.disabled'],
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: '@acme/codegraphy-plugin-disabled-runtime',
      }],
    });

    const loadedPlugins = await loadCodeGraphyWorkspacePluginPackages({
      settings: readCodeGraphyWorkspaceSettings(workspaceRoot),
      homeDir,
      workspaceRoot,
      disabledPlugins: new Set(['acme.disabled-runtime']),
    });

    expect(loadedPlugins).toEqual([]);
    await expect(fs.access(importMarkerPath)).rejects.toThrow();
    await expect(fs.access(factoryMarkerPath)).rejects.toThrow();
  });
});
