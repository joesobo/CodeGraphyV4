import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_ID,
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import { WorkspacePipelineLifecycleFacade as WorkspacePipelinePluginStatusReader } from '../../../../src/extension/pipeline/service/lifecycleFacade';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import type { IDiscoveredFile } from '@codegraphy-dev/core';

const homedirMock = vi.hoisted(() => vi.fn<() => string>());

vi.mock('node:os', async importOriginal => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: homedirMock,
  };
});

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
}));

class PluginStatusReader extends WorkspacePipelinePluginStatusReader {
  constructor(private readonly workspaceRoot: string) {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = { files: {} } as unknown as IWorkspaceAnalysisCache;
    this._lastDiscoveredFiles = [
      { absolutePath: `${workspaceRoot}/src/index.ts`, relativePath: 'src/index.ts' },
    ] as IDiscoveredFile[];
    this._lastFileConnections = new Map([['src/index.ts', []]]);
  }

  registerTypeScriptPackagePlugin(): void {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    this._registry.register(
      {
        id: 'codegraphy.typescript',
        name: 'TypeScript/JavaScript',
        version: '2.1.0',
        apiVersion: '^4.0.0',
        supportedExtensions: ['.ts', '.tsx'],
        analyzeFile: vi.fn(),
      },
      {
        sourcePackage: '@codegraphy-dev/plugin-typescript',
        sourcePackageRoot: '/global/node_modules/@codegraphy-dev/plugin-typescript',
      },
    );
    logSpy.mockRestore();
  }

  async registerExtensionPackagePlugin(initialize?: () => Promise<void>): Promise<void> {
    this._registry.extensionPlugins.register(
      {
        id: 'acme.particles',
        name: 'Particles',
        version: '1.0.0',
        apiVersion: '^1.0.0',
        ...(initialize ? { initialize } : {}),
      },
      {
        sourcePackage: '@acme/plugin-particles',
        sourcePackageRoot: '/global/node_modules/@acme/plugin-particles',
      },
    );
    await this._registry.extensionPlugins.initializeAll(this.workspaceRoot);
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }
}

describe('pipeline/service plugin statuses', () => {
  let tempRoot: string;
  let homeDir: string;
  let workspaceRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'codegraphy-plugin-status-facade-'));
    homeDir = path.join(tempRoot, 'home');
    workspaceRoot = path.join(tempRoot, 'workspace');
    fs.mkdirSync(workspaceRoot, { recursive: true });
    homedirMock.mockReturnValue(homeDir);
  });

  afterEach(() => {
    homedirMock.mockReset();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it('reports registered package plugins as package-backed statuses', () => {
    writeCodeGraphyInstalledPluginCache({ version: 3, plugins: [] }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [
        { id: CODEGRAPHY_MARKDOWN_PLUGIN_ID, activation: 'enabled' },
        { id: 'codegraphy.typescript', activation: 'enabled' },
      ],
      interfaces: [],
    });

    const reader = new PluginStatusReader(workspaceRoot);
    reader.registerTypeScriptPackagePlugin();
    const statuses = reader.getPluginStatuses(new Set());
    const packageStatuses = statuses.filter(status => status.packageName);

    expect(packageStatuses.map(status => status.packageName)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy-dev/plugin-typescript',
    ]);
    expect(packageStatuses).toEqual([
      expect.objectContaining({
        id: 'codegraphy.markdown',
        enabled: true,
        status: 'unavailable',
      }),
      expect.objectContaining({
        id: 'codegraphy.typescript',
        name: 'TypeScript/JavaScript',
        packageName: '@codegraphy-dev/plugin-typescript',
        enabled: true,
        status: 'installed',
      }),
    ]);
  });

  it('reports a loaded Extension plugin as active', async () => {
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/plugin-particles',
        version: '1.0.0',
        id: 'acme.particles',
        host: 'codegraphy.extension',
        entry: './plugin.js',
        apiVersion: '^1.0.0',
        packageRoot: '/global/node_modules/@acme/plugin-particles',
        globallyEnabled: true,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [{ id: 'acme.particles', activation: 'inherit' }],
      interfaces: [],
    });

    const reader = new PluginStatusReader(workspaceRoot);
    await reader.registerExtensionPackagePlugin();

    expect(reader.getPluginStatuses(new Set())).toContainEqual(
      expect.objectContaining({
        id: 'acme.particles',
        enabled: true,
        status: 'active',
      }),
    );
  });

  it('does not report a failed Extension plugin runtime as active', async () => {
    writeCodeGraphyInstalledPluginCache({
      version: 3,
      plugins: [{
        package: '@acme/plugin-particles',
        version: '1.0.0',
        id: 'acme.particles',
        host: 'codegraphy.extension',
        entry: './plugin.js',
        apiVersion: '^1.0.0',
        packageRoot: '/global/node_modules/@acme/plugin-particles',
        globallyEnabled: true,
      }],
    }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [{ id: 'acme.particles', activation: 'inherit' }],
      interfaces: [],
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reader = new PluginStatusReader(workspaceRoot);
    await reader.registerExtensionPackagePlugin(async () => {
      throw new Error('initialize failed');
    });

    expect(reader.getPluginStatuses(new Set())).toContainEqual(
      expect.objectContaining({
        id: 'acme.particles',
        enabled: true,
        status: 'unavailable',
      }),
    );
    errorSpy.mockRestore();
  });
});
