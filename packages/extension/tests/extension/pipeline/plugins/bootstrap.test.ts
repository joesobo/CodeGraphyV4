import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
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

function createRegistry() {
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

async function createWorkspace(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-bootstrap-'));
}

async function createPluginPackage(packageRoot: string): Promise<void> {
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

async function createManifestPluginPackage(
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

async function createPluginPackageWithRuntimeMarkers(packageRoot: string): Promise<{
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

async function createDataHostPluginPackage(packageRoot: string): Promise<void> {
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

describe('pipeline/plugins/bootstrap', () => {
  it('collects unique plugin filter patterns and skips plugins without defaults', () => {
    expect(
      getWorkspacePipelinePluginFilterPatterns({
        list: () => [
          { plugin: { id: 'plugin.enabled', defaultFilters: ['**/*.generated.ts', '**/*.min.js'] } },
          { plugin: {} },
          { plugin: { id: 'plugin.disabled', defaultFilters: ['**/*.generated.ts'] } },
        ] as Array<{ plugin: { id?: string; defaultFilters?: string[] } }>,
      }),
    ).toEqual(['**/*.generated.ts', '**/*.min.js']);
  });

  it('skips default filter patterns contributed by disabled plugins', () => {
    expect(
      getWorkspacePipelinePluginFilterPatterns(
        {
          list: () => [
            { plugin: { id: 'plugin.enabled', defaultFilters: ['**/*.generated.ts', '**/*.min.js'] } },
            { plugin: { id: 'plugin.disabled', defaultFilters: ['venv/**', '**/*.generated.ts'] } },
          ],
        },
        new Set(['plugin.disabled']),
      ),
    ).toEqual(['**/*.generated.ts', '**/*.min.js']);
  });

  it('groups plugin filter patterns by plugin name and de-duplicates each plugin list', () => {
    expect(
      getWorkspacePipelinePluginFilterGroups(
        {
          list: () => [
            {
              plugin: {
                id: 'plugin.enabled',
                name: 'Enabled Plugin',
                defaultFilters: ['**/*.generated.ts', '**/*.generated.ts'],
              },
            },
            { plugin: { id: 'plugin.empty', name: 'Empty Plugin', defaultFilters: [] } },
            { plugin: { id: 'plugin.no-filters', name: 'No Filters Plugin' } },
            { plugin: { name: 'Fallback Name', defaultFilters: ['dist/**'] } },
            { plugin: { defaultFilters: ['cache/**'] } },
          ],
        },
      ),
    ).toEqual([
      {
        pluginId: 'plugin.enabled',
        pluginName: 'Enabled Plugin',
        patterns: ['**/*.generated.ts'],
      },
      {
        pluginId: 'Fallback Name',
        pluginName: 'Fallback Name',
        patterns: ['dist/**'],
      },
      {
        pluginId: 'plugin',
        pluginName: 'Plugin',
        patterns: ['cache/**'],
      },
    ]);
  });

  it('omits grouped filters from disabled plugins', () => {
    expect(
      getWorkspacePipelinePluginFilterGroups(
        {
          list: () => [
            { plugin: { id: 'plugin.enabled', name: 'Enabled Plugin', defaultFilters: ['src/**'] } },
            { plugin: { id: 'plugin.disabled', name: 'Disabled Plugin', defaultFilters: ['dist/**'] } },
          ],
        },
        new Set(['plugin.disabled']),
      ),
    ).toEqual([
      {
        pluginId: 'plugin.enabled',
        pluginName: 'Enabled Plugin',
        patterns: ['src/**'],
      },
    ]);
  });

  it('registers built-in plugins and initializes them when a workspace root exists', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
    });

    expect(registry.setCoreAnalyzeFileResult).toHaveBeenCalledOnce();
    expect(registry.setCoreGraphScopeCapabilitiesProvider).toHaveBeenCalledWith(
      listCoreTreeSitterGraphScopeCapabilities,
    );
    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.register.mock.calls.map(([, options]) => options)).toEqual([
      { builtIn: true, sourcePackage: '@codegraphy-dev/plugin-markdown' },
    ]);
    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.markdown']);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('passes Markdown workspace options to the built-in Markdown plugin', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-global-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.extension-bootstrap',
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.extension-bootstrap',
        enabled: true,
        options: {
          includeFrontmatter: false,
        },
      }, {
        id: 'codegraphy.markdown',
        enabled: true,
        options: {
          includeFrontmatter: true,
        },
      }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    const markdownRegistration = registry.register.mock.calls.find(
      ([plugin]) => plugin.id === 'codegraphy.markdown',
    );

    expect(markdownRegistration?.[1]).toEqual({
      builtIn: true,
      sourcePackage: '@codegraphy-dev/plugin-markdown',
      options: {
        includeFrontmatter: true,
      },
    });
  });

  it('prefers a bundled plugin package over a stale installed package record', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageName = '@acme/codegraphy-plugin-bundled';
    const pluginId = 'acme.bundled';
    const stalePackageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-global-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-bundled',
    );
    const bundledPackageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-bundled-')),
      'codegraphy-plugin-bundled',
    );

    await createManifestPluginPackage(stalePackageRoot, {
      marker: 'stale-installed',
      packageName,
      pluginId,
      version: '1.0.0',
    });
    await createManifestPluginPackage(bundledPackageRoot, {
      marker: 'fresh-bundled',
      packageName,
      pluginId,
      version: '1.0.1',
    });
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: packageName,
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot: stalePackageRoot,
        pluginId,
        pluginName: 'Bundled',
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: pluginId, enabled: true },
      ],
    });

    await initializeWorkspacePipeline(registry as never, {
      bundledPluginPackageRoots: [bundledPackageRoot],
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    const bundledRegistration = registry.register.mock.calls.find(
      ([plugin]) => plugin.id === pluginId,
    );

    expect(bundledRegistration?.[0].fileColors?.['*.txt']).toEqual(expect.objectContaining({
      marker: 'fresh-bundled',
      shape2D: 'triangle',
      imagePath: 'assets/example.svg',
    }));
    expect(bundledRegistration?.[1]).toEqual({
      builtIn: true,
      sourcePackage: packageName,
      sourcePackageRoot: bundledPackageRoot,
    });
    expect(registry.register.mock.calls.map(([plugin]) => plugin.id)).toEqual([
      'codegraphy.markdown',
      pluginId,
    ]);
  });

  it('registers enabled npm plugin packages for the current CodeGraphy Workspace', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-global-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.extension-bootstrap',
        defaultOptions: {
          mode: 'strict',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'codegraphy.markdown',
        enabled: true,
      }, {
        id: 'acme.extension-bootstrap',
        enabled: true,
        options: {
          mode: 'strict',
        },
      }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
      warn: vi.fn(),
    });

    expect(registry.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.extension-bootstrap' }),
      expect.objectContaining({
        sourcePackage: '@acme/codegraphy-plugin-extension-bootstrap',
        options: {
          mode: 'strict',
        },
      }),
    );
    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('does not register installed package plugins that are not enabled for the current CodeGraphy Workspace', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-global-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.extension-bootstrap',
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ id: 'codegraphy.markdown', enabled: true }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.markdown']);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('passes workspace plugin data host to package factories in the extension pipeline', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-global-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-data-host',
    );

    await createDataHostPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-data-host',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: ['workspaceWrites'],
        packageRoot,
        pluginId: 'acme.extension-data-host',
        defaultOptions: {
          mode: 'default',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        id: 'acme.extension-data-host',
        enabled: true,
        options: {
          mode: 'workspace',
        },
      }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });
    const plugin = registry.register.mock.calls
      .map(([registeredPlugin]) => registeredPlugin)
      .find(registeredPlugin => registeredPlugin.id === 'acme.extension-data-host');

    await plugin?.initialize?.(workspaceRoot);

    expect(registry.register.mock.calls.map(([registeredPlugin]) => registeredPlugin.id)).toEqual([
      'acme.extension-data-host',
    ]);
    expect(readCodeGraphyWorkspaceSettings(workspaceRoot).pluginData).toEqual({
      'acme.extension-data-host': {
        mode: 'workspace',
      },
    });
  });

  it('does not register Markdown when the workspace plugins array removes it', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
    });

    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual([]);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('does not register disabled Markdown or package runtimes during extension pipeline initialization', async () => {
    const registry = createRegistry();
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-global-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );
    const { factoryMarkerPath, importMarkerPath } = await createPluginPackageWithRuntimeMarkers(packageRoot);

    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.extension-bootstrap',
        pluginName: 'Extension Bootstrap',
        supportedExtensions: ['.txt'],
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'acme.extension-bootstrap', enabled: true },
      ],
    });

    await initializeWorkspacePipeline(registry as never, {
      disabledPlugins: new Set(['codegraphy.markdown', 'acme.extension-bootstrap']),
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(registry.register.mock.calls.map(([plugin]) => plugin.id)).toEqual([]);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
    await expect(fs.access(importMarkerPath)).rejects.toThrow();
    await expect(fs.access(factoryMarkerPath)).rejects.toThrow();
  });

  it('syncs workspace plugin selection without unregistering core Tree-sitter analysis', async () => {
    const workspaceRoot = await createWorkspace();
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [],
    });
    const registeredPlugins = new Map<string, {
      plugin: { id: string };
      builtIn: boolean;
      sourcePackage?: string;
      sourcePackageRoot?: string;
      options?: Record<string, unknown>;
    }>([
      [
        'codegraphy.markdown',
        {
          plugin: { id: 'codegraphy.markdown' },
          builtIn: true,
          sourcePackage: '@codegraphy-dev/plugin-markdown',
        },
      ],
    ]);
    const registry = {
      get: vi.fn((pluginId: string) => registeredPlugins.get(pluginId)),
      list: vi.fn(() => [...registeredPlugins.values()]),
      register: vi.fn(),
      unregister: vi.fn((pluginId: string) => registeredPlugins.delete(pluginId)),
      initializePlugin: vi.fn(async () => undefined),
    };

    await syncWorkspacePipelinePlugins(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
    });

    expect(registry.unregister).toHaveBeenCalledTimes(1);
    expect(registry.unregister).toHaveBeenCalledWith('codegraphy.markdown');
    expect(registry.register).not.toHaveBeenCalled();
    expect(registry.initializePlugin).not.toHaveBeenCalled();
  });

  it('syncs newly enabled package plugins without re-registering existing plugins', async () => {
    const workspaceRoot = await createWorkspace();
    const homeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-home-'));
    const packageRoot = path.join(
      await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-extension-global-')),
      'node_modules',
      '@acme',
      'codegraphy-plugin-extension-bootstrap',
    );

    await createPluginPackage(packageRoot);
    writeCodeGraphyInstalledPluginCache({
      version: 1,
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        version: '1.0.0',
        apiVersion: '^2.0.0',
        disclosures: [],
        packageRoot,
        pluginId: 'acme.extension-bootstrap',
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [
        { id: 'codegraphy.markdown', enabled: true },
        { id: 'acme.extension-bootstrap', enabled: true },
      ],
    });
    const registeredPlugins = new Map<string, {
      plugin: { id: string };
      builtIn: boolean;
      sourcePackage?: string;
      sourcePackageRoot?: string;
      options?: Record<string, unknown>;
    }>([
      [
        'codegraphy.markdown',
        {
          plugin: { id: 'codegraphy.markdown' },
          builtIn: true,
          sourcePackage: '@codegraphy-dev/plugin-markdown',
        },
      ],
    ]);
    const registry = {
      get: vi.fn((pluginId: string) => registeredPlugins.get(pluginId)),
      list: vi.fn(() => [...registeredPlugins.values()]),
      register: vi.fn((plugin, options) => {
        registeredPlugins.set(plugin.id, {
          plugin,
          builtIn: Boolean(options.builtIn),
          sourcePackage: options.sourcePackage,
          sourcePackageRoot: options.sourcePackageRoot,
          options: options.options,
        });
      }),
      unregister: vi.fn((pluginId: string) => registeredPlugins.delete(pluginId)),
      initializePlugin: vi.fn(async () => undefined),
    };

    await syncWorkspacePipelinePlugins(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(registry.unregister).not.toHaveBeenCalled();
    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.register).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'acme.extension-bootstrap' }),
      expect.objectContaining({
        sourcePackage: '@acme/codegraphy-plugin-extension-bootstrap',
      }),
    );
    expect(registry.initializePlugin).toHaveBeenCalledWith(
      'acme.extension-bootstrap',
      workspaceRoot,
    );
    expect(registry.initializePlugin).toHaveBeenCalledTimes(1);
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    const registry = createRegistry();

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => undefined,
    });

    expect(registry.register).toHaveBeenCalledTimes(1);
    expect(registry.initializeAll).not.toHaveBeenCalled();
  });
});
