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

export async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-bootstrap-'));
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
    JSON.stringify({
      name: '@acme/codegraphy-plugin-extension-bootstrap',
      version: '1.0.0',
      type: 'module',
      exports: './plugin.js',
      codegraphy: {
        type: 'plugin',
        apiVersion: '^2.0.0',
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
    apiVersion: '^2.0.0',
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
        type: 'plugin',
        apiVersion: '^2.0.0',
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
      apiVersion: '^2.0.0',
      supportedExtensions: ['.txt'],
      fileColors: {
        '*.txt': {
          color: '#0EA5E9',
          shape2D: 'triangle',
          imagePath: 'assets/example.svg',
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
    apiVersion: '^2.0.0',
    supportedExtensions: ['.txt'],
    fileColors: {
      '*.txt': {
        color: '#0EA5E9',
        shape2D: 'triangle',
        imagePath: 'assets/example.svg',
        marker: ${JSON.stringify(input.marker)}
      }
    }
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
        type: 'plugin',
        apiVersion: '^2.0.0',
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
    apiVersion: '^2.0.0',
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
        type: 'plugin',
        apiVersion: '^2.0.0',
        defaultOptions: {
          mode: 'default',
        },
      },
    }, null, 2),
    'utf-8',
  );
  await fs.writeFile(
    path.join(packageRoot, 'plugin.js'),
    `
export default function createPlugin(factoryOptions = {}) {
  const dataHost = factoryOptions.dataHost;
  const mode = factoryOptions.options?.mode ?? 'missing';

  return {
    id: 'acme.extension-data-host',
    name: 'Extension Data Host',
    version: '1.0.0',
    apiVersion: '^2.0.0',
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
