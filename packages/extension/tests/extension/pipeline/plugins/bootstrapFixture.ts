import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { vi } from 'vitest';
import {
  listCoreTreeSitterGraphScopeCapabilities,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
} from '../../../../src/extension/pipeline/plugins/bootstrap';

export function createRegistry() {
  return {
    extensionPlugins: {
      get: vi.fn(() => undefined),
      initializeAll: vi.fn(async () => undefined),
      list: vi.fn(() => []),
      register: vi.fn(),
      unregister: vi.fn(() => true),
    },
    get: vi.fn(() => undefined),
    list: vi.fn(() => []),
    initializeAll: vi.fn(async () => undefined),
    initializePlugin: vi.fn(async () => undefined),
    register: vi.fn(),
    setCoreAnalyzeFileResult: vi.fn(),
    setCoreGraphScopeCapabilitiesProvider: vi.fn(),
    unregister: vi.fn(() => true),
  };
}

export async function createExtensionPluginPackage(packageRoot: string): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-extension-particles',
      version: '1.0.0',
      type: 'module',
      codegraphy: {
        plugins: [{
          id: 'acme.particles',
          name: 'Particles',
          host: 'codegraphy.extension',
          entry: './plugin.js',
          apiVersion: '^1.0.0',
        }],
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin() {
  return {
    id: 'acme.particles',
    name: 'Particles',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    webviewContributions: { scripts: ['./dist/webview.js'] }
  };
}
`,
    'utf-8',
  );
}

export async function createExtensionDataHostPluginPackage(packageRoot: string): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-extension-data-host',
      version: '1.0.0',
      type: 'module',
      codegraphy: {
        plugins: [{
          id: 'acme.extension-data-host',
          host: 'codegraphy.extension',
          entry: './plugin.js',
          apiVersion: '^1.0.0',
          data: {
            defaultOptions: {
              mode: 'default',
              defaultOnly: true,
            },
          },
        }],
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin(factoryOptions = {}) {
  return {
    id: 'acme.extension-data-host',
    name: 'Extension Data Host',
    version: '1.0.0',
    apiVersion: '^1.0.0',
    async initialize() {
      if (!factoryOptions.dataHost) {
        throw new Error('Expected Extension plugin data host.');
      }
      await factoryOptions.dataHost.saveData(factoryOptions.options);
    }
  };
}
`,
    'utf-8',
  );
}

export async function createIncompatibleExtensionPluginPackageWithRuntimeMarkers(
  packageRoot: string,
): Promise<{
  factoryMarkerPath: string;
  importMarkerPath: string;
}> {
  const importMarkerPath = path.join(packageRoot, 'runtime-imported.txt');
  const factoryMarkerPath = path.join(packageRoot, 'factory-called.txt');

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-extension-incompatible',
      version: '1.0.0',
      type: 'module',
      codegraphy: {
        plugins: [{
          id: 'acme.extension-incompatible',
          host: 'codegraphy.extension',
          entry: './plugin.js',
          apiVersion: '^99.0.0',
        }],
      },
    }, null, 2),
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
    id: 'acme.extension-incompatible',
    name: 'Incompatible Extension Plugin',
    version: '1.0.0',
    apiVersion: '^99.0.0'
  };
}
`,
    'utf-8',
  );

  return { factoryMarkerPath, importMarkerPath };
}

export async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-bootstrap-'));
}

export async function createPackageFixtureRoot(prefix: string): Promise<string> {
  const root = path.join(process.cwd(), 'node_modules', '.cache', 'codegraphy-test-packages');
  await fs.mkdir(root, { recursive: true });
  return fs.mkdtemp(path.join(root, prefix));
}

export async function createPluginPackage(
  packageRoot: string,
  apiVersion = '^4.0.0',
): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-plugin-extension-bootstrap',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        plugins: [{
          id: 'acme.extension-bootstrap',
          host: 'core',
          entry: './plugin.js',
          apiVersion,
        }],
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin() {
  return {
    id: 'acme.extension-bootstrap',
    name: 'Extension Bootstrap',
    version: '1.0.0',
    apiVersion: '${apiVersion}',
    supportedExtensions: ['.txt'],
    async analyzeFile(filePath) {
      return { filePath, relations: [] };
    }
  };
}
`,
    'utf-8',
  );
}

export async function createManifestPluginPackage(
  packageRoot: string,
  input: {
    marker: string;
    packageName?: string;
    pluginId?: string;
    pluginName?: string;
    version?: string;
  },
): Promise<void> {
  const packageName = input.packageName ?? '@acme/codegraphy-plugin-extension-bootstrap';
  const pluginId = input.pluginId ?? 'acme.extension-bootstrap';
  const pluginName = input.pluginName ?? 'Extension Bootstrap';
  const version = input.version ?? '1.0.0';

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: packageName,
      version,
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        plugins: [{
          id: pluginId,
          name: pluginName,
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
        }],
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'codegraphy.json'),
    JSON.stringify({
      id: pluginId,
      name: pluginName,
      version,
      apiVersion: '^4.0.0',
      supportedExtensions: ['.txt'],
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'codegraphy.extension.json'),
    JSON.stringify({
      fileColors: {
        '*.txt': {
          color: '#0EA5E9',
          shape2D: 'triangle',
          imagePath: 'assets/example.svg',
          marker: input.marker,
        },
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin() {
  return {
    id: ${JSON.stringify(pluginId)},
    name: ${JSON.stringify(pluginName)},
    version: ${JSON.stringify(version)},
    apiVersion: '^4.0.0',
    supportedExtensions: ['.txt']
  };
}
`,
    'utf-8',
  );
}

export async function createPluginPackageWithRuntimeMarkers(packageRoot: string): Promise<{
  factoryMarkerPath: string;
  importMarkerPath: string;
}> {
  const importMarkerPath = path.join(packageRoot, 'runtime-imported.txt');
  const factoryMarkerPath = path.join(packageRoot, 'factory-called.txt');

  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-plugin-extension-bootstrap',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        plugins: [{
          id: 'acme.extension-bootstrap',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
        }],
      },
    }, null, 2),
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
    id: 'acme.extension-bootstrap',
    name: 'Extension Bootstrap',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: ['.txt']
  };
}
`,
    'utf-8',
  );

  return { factoryMarkerPath, importMarkerPath };
}

export async function createDataHostPluginPackage(packageRoot: string): Promise<void> {
  await fs.mkdir(packageRoot, { recursive: true });
  await fs.writeFile(
    path.join(packageRoot, 'package.json'),
    JSON.stringify({
      name: '@acme/codegraphy-plugin-extension-data-host',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        plugins: [{
          id: 'acme.extension-data-host',
          host: 'core',
          entry: './plugin.js',
          apiVersion: '^4.0.0',
        }],
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin(factoryOptions = {}) {
  const dataHost = factoryOptions.dataHost;
  const mode = factoryOptions.options?.mode ?? 'default';

  return {
    id: 'acme.extension-data-host',
    name: 'Extension Data Host',
    version: '1.0.0',
    apiVersion: '^4.0.0',
    supportedExtensions: [],
    async initialize() {
      if (!dataHost) {
        throw new Error('Expected extension data host.');
      }
      await dataHost.saveData({ mode });
    }
  };
}
`,
    'utf-8',
  );
}


export {
  listCoreTreeSitterGraphScopeCapabilities,
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
  fs,
  os,
  path,
};
