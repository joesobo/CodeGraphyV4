import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
  writeCodeGraphyInstalledPluginCache,
  writeCodeGraphyWorkspaceSettings,
} from '@codegraphy-dev/core';
import { WorkspacePipelineLifecycleFacade } from '../../../../src/extension/pipeline/service/lifecycleFacade';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';

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

class StatusLifecycleFacade extends WorkspacePipelineLifecycleFacade {
  constructor(private readonly workspaceRoot: string) {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = { files: {} } as unknown as IWorkspaceAnalysisCache;
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.workspaceRoot;
  }
}

describe('pipeline/service/lifecycleFacade plugin statuses', () => {
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

  it('reports workspace-enabled package plugins even when the installed plugin cache is empty', () => {
    writeCodeGraphyInstalledPluginCache({ version: 1, plugins: [] }, { homeDir });
    writeCodeGraphyWorkspaceSettings(workspaceRoot, {
      version: 1,
      maxFiles: 1000,
      include: ['**/*'],
      respectGitignore: true,
      showOrphans: true,
      filterPatterns: [],
      disabledCustomFilterPatterns: [],
      plugins: [
        { package: CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME },
        { package: '@codegraphy-dev/plugin-typescript' },
        { package: '@codegraphy-dev/plugin-godot' },
        { package: '@codegraphy-dev/plugin-python' },
        { package: '@codegraphy-dev/plugin-csharp' },
      ],
    });

    const statuses = new StatusLifecycleFacade(workspaceRoot).getPluginStatuses(new Set());
    const packageStatuses = statuses.filter(status => status.packageName);

    expect(packageStatuses.map(status => status.packageName)).toEqual([
      CODEGRAPHY_MARKDOWN_PLUGIN_PACKAGE_NAME,
      '@codegraphy-dev/plugin-typescript',
      '@codegraphy-dev/plugin-godot',
      '@codegraphy-dev/plugin-python',
      '@codegraphy-dev/plugin-csharp',
    ]);
    expect(packageStatuses).toEqual([
      expect.objectContaining({
        id: 'codegraphy.markdown',
        enabled: true,
        status: 'unavailable',
      }),
      expect.objectContaining({
        packageName: '@codegraphy-dev/plugin-typescript',
        enabled: true,
        status: 'unavailable',
      }),
      expect.objectContaining({
        packageName: '@codegraphy-dev/plugin-godot',
        enabled: true,
        status: 'unavailable',
      }),
      expect.objectContaining({
        packageName: '@codegraphy-dev/plugin-python',
        enabled: true,
        status: 'unavailable',
      }),
      expect.objectContaining({
        packageName: '@codegraphy-dev/plugin-csharp',
        enabled: true,
        status: 'unavailable',
      }),
    ]);
  });
});
