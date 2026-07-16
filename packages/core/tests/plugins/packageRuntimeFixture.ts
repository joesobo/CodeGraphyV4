import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

export async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-package-runtime-workspace-'));
}

export async function createPackageFixtureRoot(prefix: string): Promise<string> {
  const root = path.join(process.cwd(), 'node_modules', '.cache', 'codegraphy-test-packages');
  await fs.mkdir(root, { recursive: true });
  return fs.mkdtemp(path.join(root, prefix));
}

export async function createPluginPackage(packageRoot: string): Promise<void> {
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
        apiVersion: '^3.0.0',
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
    apiVersion: '^3.0.0',
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

export async function createPluginPackageWithRuntimeMarkers(
  packageRoot: string,
  packageName = '@acme/codegraphy-plugin-disabled-runtime',
  pluginId = 'acme.disabled-runtime',
  pluginName = 'Disabled Runtime Plugin',
  version = '1.0.0',
): Promise<{
  factoryMarkerPath: string;
  importMarkerPath: string;
}> {
  const importMarkerPath = path.join(packageRoot, 'runtime-imported.txt');
  const factoryMarkerPath = path.join(packageRoot, 'factory-called.txt');

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    `${JSON.stringify({
      name: packageName,
      version,
      type: 'module',
      exports: './plugin.js',
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
      id: pluginId,
      name: pluginName,
      version,
      apiVersion: '^3.0.0',
      supportedExtensions: ['.disabled'],
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
    id: ${JSON.stringify(pluginId)},
    name: ${JSON.stringify(pluginName)},
    version: ${JSON.stringify(version)},
    apiVersion: '^3.0.0',
    supportedExtensions: ['.disabled']
  };
}
`,
    'utf-8',
  );

  return { factoryMarkerPath, importMarkerPath };
}

export { fs, os, path };
