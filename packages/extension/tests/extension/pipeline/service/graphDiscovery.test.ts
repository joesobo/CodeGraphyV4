import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import type { FileDiscovery, IDiscoveredFile } from '@codegraphy-dev/core';
import type { IProjectedConnection } from '../../../../src/core/plugins/types/contracts';
import type { Configuration } from '../../../../src/extension/config/reader';
import { WorkspacePipelineGraphDiscoveryFacade } from '../../../../src/extension/pipeline/service/graphDiscovery';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../src/extension/pipeline/service/runtime/discovery';
import type { IGraphData } from '../../../../src/shared/graph/contracts';

vi.mock('../../../../src/extension/pipeline/service/runtime/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
  },
  window: {
    showWarningMessage: vi.fn(),
  },
}));

class TestGraphDiscoveryFacade extends WorkspacePipelineGraphDiscoveryFacade {
  readonly buildGraphData = vi.fn((
    _fileConnections: Map<string, IProjectedConnection[]>,
    _workspaceRoot: string,
    _showOrphans: boolean,
    _disabledPlugins: Set<string>,
  ): IGraphData => ({
    nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }],
    edges: [],
  }));
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');

  _config = {
    get: vi.fn((_key: string, defaultValue: unknown) => defaultValue),
    getAll: vi.fn(() => ({ respectGitignore: true, showOrphans: true })),
  } as unknown as Configuration;

  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;

  get discoveredDirectories(): string[] {
    return this._lastDiscoveredDirectories;
  }

  get discoveredFiles(): IDiscoveredFile[] {
    return this._lastDiscoveredFiles;
  }

  get fileAnalysis(): ReadonlyMap<string, unknown> {
    return this._lastFileAnalysis;
  }

  get fileConnections(): ReadonlyMap<string, IProjectedConnection[]> {
    return this._lastFileConnections;
  }

  get gitIgnoredPaths(): string[] {
    return this._lastGitIgnoredPaths;
  }

  get workspaceRoot(): string {
    return this._lastWorkspaceRoot;
  }

  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
  }

  protected override _buildGraphData(
    fileConnections: Map<string, IProjectedConnection[]>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string> = new Set(),
  ): IGraphData {
    return this.buildGraphData(fileConnections, workspaceRoot, showOrphans, disabledPlugins);
  }

  protected override _getEffectiveCustomFilterPatterns(filterPatterns: string[]): string[] {
    return filterPatterns.length > 0 ? [`custom:${filterPatterns.join(',')}`] : [];
  }

  protected override _getEffectivePluginFilterPatterns(disabledPlugins: ReadonlySet<string>): string[] {
    return [...disabledPlugins].map(pluginId => `plugin:${pluginId}`);
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }
}

describe('extension/pipeline/service/graphDiscovery', () => {
  const fileA = {
    absolutePath: '/workspace/src/a.ts',
    relativePath: 'src/a.ts',
  } as IDiscoveredFile;
  const fileB = {
    absolutePath: '/workspace/src/b.ts',
    relativePath: 'src/b.ts',
  } as IDiscoveredFile;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelineDiscoveryDependencies).mockReturnValue('discovery-deps' as never);
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValue({
      directories: ['src'],
      files: [fileA, fileB],
      gitIgnoredPaths: ['dist/generated.ts'],
    } as never);
  });

  it('returns an empty graph without discovery when no workspace is open', async () => {
    const facade = new TestGraphDiscoveryFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(facade.discoverGraph()).resolves.toEqual({ nodes: [], edges: [] });

    expect(log).toHaveBeenCalledWith('[CodeGraphy] No workspace folder open');
    expect(discoverWorkspacePipelineFilesWithWarnings).not.toHaveBeenCalled();
    expect(facade.buildGraphData).not.toHaveBeenCalled();
  });

  it('discovers workspace files, stores discovery state, and builds the cold graph', async () => {
    const facade = new TestGraphDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;

    await expect(facade.discoverGraph(['dist/**'], disabledPlugins, signal)).resolves.toEqual({
      nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }],
      edges: [],
    });

    expect(createWorkspacePipelineDiscoveryDependencies).toHaveBeenCalledWith(facade._discovery);
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { respectGitignore: true, showOrphans: true },
      ['custom:dist/**'],
      ['plugin:plugin.disabled'],
      signal,
      expect.any(Function),
    );

    const warn = vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mock.calls[0][6];
    warn('Discovery warning');
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('Discovery warning');

    const expectedConnections = new Map<string, IProjectedConnection[]>([
      ['src/a.ts', []],
      ['src/b.ts', []],
    ]);
    expect(facade.buildGraphData).toHaveBeenCalledWith(
      expectedConnections,
      '/workspace',
      true,
      disabledPlugins,
    );
    expect(facade.discoveredDirectories).toEqual(['src']);
    expect(facade.discoveredFiles).toEqual([fileA, fileB]);
    expect(facade.fileAnalysis).toEqual(new Map());
    expect(facade.fileConnections).toEqual(expectedConnections);
    expect(facade.gitIgnoredPaths).toEqual(['dist/generated.ts']);
    expect(facade.workspaceRoot).toBe('/workspace');
  });

  it('stores empty directory and gitignore lists when discovery omits them', async () => {
    const facade = new TestGraphDiscoveryFacade();
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValueOnce({
      files: [fileA],
    } as never);

    await facade.discoverGraph();

    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { respectGitignore: true, showOrphans: true },
      [],
      [],
      undefined,
      expect.any(Function),
    );
    expect(facade.discoveredDirectories).toEqual([]);
    expect(facade.gitIgnoredPaths).toEqual([]);
    expect(facade.fileConnections).toEqual(new Map([['src/a.ts', []]]));
  });
});
