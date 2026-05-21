import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  readCodeGraphyWorkspaceSettings,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import {
  getWorkspacePipelinePluginFilterGroups,
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
} from '../../../../src/extension/pipeline/plugins/bootstrap';

function createRegistry() {
  return {
    initializeAll: vi.fn(async () => undefined),
    register: vi.fn(),
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
            { plugin: { name: 'Fallback Name', defaultFilters: ['dist/**'] } },
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

    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.register.mock.calls.map(([, options]) => options)).toEqual([
      { builtIn: true },
      { builtIn: true, sourcePackage: '@codegraphy-dev/plugin-markdown' },
    ]);
    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.treesitter', 'codegraphy.markdown']);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
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
        defaultOptions: {
          mode: 'strict',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: '@codegraphy-dev/plugin-markdown',
      }, {
        package: '@acme/codegraphy-plugin-extension-bootstrap',
        options: {
          mode: 'strict',
        },
      }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
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
    expect(registry.register).toHaveBeenCalledTimes(3);
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
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{ package: '@codegraphy-dev/plugin-markdown' }],
    });

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => workspaceRoot,
      userHomeDir: homeDir,
    });

    expect(
      registry.register.mock.calls.map(([plugin]) => plugin.id),
    ).toEqual(['codegraphy.treesitter', 'codegraphy.markdown']);
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
        defaultOptions: {
          mode: 'default',
        },
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      ...readCodeGraphyWorkspaceSettings(workspaceRoot),
      plugins: [{
        package: '@acme/codegraphy-plugin-extension-data-host',
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
    ).toEqual(['codegraphy.treesitter']);
    expect(registry.initializeAll).toHaveBeenCalledWith(workspaceRoot);
  });

  it('skips plugin initialization when no workspace root is available', async () => {
    const registry = createRegistry();

    await initializeWorkspacePipeline(registry as never, {
      getWorkspaceRoot: () => undefined,
    });

    expect(registry.register).toHaveBeenCalledTimes(2);
    expect(registry.initializeAll).not.toHaveBeenCalled();
  });
});
