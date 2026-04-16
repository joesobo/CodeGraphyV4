import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { WorkspacePipelineRefreshFacade } from '../../../../src/extension/pipeline/service/refreshFacade';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../src/extension/pipeline/service/discovery';
import { refreshWorkspacePipelineChangedFiles } from '../../../../src/extension/pipeline/service/refresh';

vi.mock('../../../../src/extension/pipeline/service/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/refresh', () => ({
  refreshWorkspacePipelineChangedFiles: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
  window: {
    showWarningMessage: vi.fn(),
  },
}));

class TestRefreshFacade extends WorkspacePipelineRefreshFacade {
  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
  }

  _config = {
    getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true })),
  } as never;

  _discovery = { kind: 'discovery' } as never;
  _registry = {
    notifyFilesChanged: vi.fn(async () => ({ additionalFilePaths: [], requiresFullRefresh: false })),
  } as never;

  _lastDiscoveredFiles = [] as never;
  _lastFileAnalysis = new Map() as never;
  _lastFileConnections = new Map() as never;
  _lastWorkspaceRoot = '';

  _syncPluginOrder = vi.fn();
  _getWorkspaceRoot = vi.fn(() => '/workspace');
  getPluginFilterPatterns = vi.fn(() => ['plugin-filter']);
  _persistCache = vi.fn();
  _persistIndexMetadata = vi.fn(async () => undefined);
  _toWorkspaceRelativePath = vi.fn((root: string, filePath: string) => filePath.replace(`${root}/`, ''));
  _readAnalysisFiles = vi.fn(async () => []);
  _analyzeFiles = vi.fn(async () => ({
    cacheHits: 0,
    cacheMisses: 0,
    fileAnalysis: new Map(),
    fileConnections: new Map(),
  })) as never;
  _buildGraphDataFromAnalysis = vi.fn(() => ({ nodes: [], edges: [] })) as never;
  analyze = vi.fn(async () => ({ nodes: [], edges: [] })) as never;
  invalidateWorkspaceFiles = vi.fn((filePaths: readonly string[]) => [...filePaths]);
  clearCache = vi.fn(async () => undefined);
}

describe('pipeline/service/refreshFacade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspacePipelineDiscoveryDependencies).mockReturnValue('discovery-deps' as never);
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValue({
      files: [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }],
    } as never);
    vi.mocked(refreshWorkspacePipelineChangedFiles).mockResolvedValue({
      nodes: [{ id: 'refresh' }],
      edges: [],
    } as never);
  });

  it('returns an empty graph immediately when no workspace root is available', async () => {
    const facade = new TestRefreshFacade();
    facade._getWorkspaceRoot.mockReturnValue(undefined as never);

    await expect(facade.refreshChangedFiles(['/workspace/src/a.ts'])).resolves.toEqual({
      nodes: [],
      edges: [],
    });

    expect(facade._syncPluginOrder).toHaveBeenCalledOnce();
    expect(discoverWorkspacePipelineFilesWithWarnings).not.toHaveBeenCalled();
    expect(refreshWorkspacePipelineChangedFiles).not.toHaveBeenCalled();
  });

  it('builds delegated discovery and refresh dependencies for changed-file refreshes', async () => {
    const facade = new TestRefreshFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();

    const result = await facade.refreshChangedFiles(
      ['/workspace/src/a.ts'],
      undefined,
      disabledPlugins,
      signal,
      onProgress,
    );

    expect(result).toEqual({ nodes: [{ id: 'refresh' }], edges: [] });
    expect(facade._syncPluginOrder).toHaveBeenCalledOnce();
    expect(createWorkspacePipelineDiscoveryDependencies).toHaveBeenCalledWith(facade._discovery);
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      [],
      ['plugin-filter'],
      signal,
      expect.any(Function),
    );

    const warningCallback = vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mock.calls[0][6];
    warningCallback('warning');
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('warning');

    const [refreshSource, refreshDependencies] = vi.mocked(refreshWorkspacePipelineChangedFiles).mock.calls[0];

    expect(refreshDependencies.config).toEqual({ showOrphans: true, respectGitignore: true });
    expect(refreshDependencies.disabledPlugins).toBe(disabledPlugins);
    expect(refreshDependencies.discoveredFiles).toEqual([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
    ]);
    expect(refreshDependencies.filePaths).toEqual(['/workspace/src/a.ts']);
    expect(refreshDependencies.filterPatterns).toEqual([]);
    expect(refreshDependencies.signal).toBe(signal);
    expect(refreshDependencies.onProgress).toBe(onProgress);
    expect(refreshDependencies.workspaceRoot).toBe('/workspace');

    await refreshDependencies.notifyFilesChanged([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts', content: 'content:a' },
    ], '/workspace');
    expect((facade._registry as { notifyFilesChanged: ReturnType<typeof vi.fn> }).notifyFilesChanged).toHaveBeenCalledWith(
      [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts', content: 'content:a' }],
      '/workspace',
    );

    refreshDependencies.persistCache();
    expect(facade._persistCache).toHaveBeenCalledOnce();

    await refreshDependencies.persistIndexMetadata();
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();

    expect(refreshDependencies.toWorkspaceRelativePath('/workspace', '/workspace/src/a.ts')).toBe('src/a.ts');
    expect(facade._toWorkspaceRelativePath).toHaveBeenCalledWith('/workspace', '/workspace/src/a.ts');

    await refreshSource._analyzeFiles([], '/workspace', undefined, signal);
    expect(facade._analyzeFiles).toHaveBeenCalledWith([], '/workspace', undefined, signal);

    refreshSource._buildGraphDataFromAnalysis(new Map(), '/workspace', true, disabledPlugins);
    expect(facade._buildGraphDataFromAnalysis).toHaveBeenCalledWith(new Map(), '/workspace', true, disabledPlugins);

    expect(refreshSource._lastDiscoveredFiles).toEqual([]);
    refreshSource._lastDiscoveredFiles = [{
      absolutePath: '/workspace/src/b.ts',
      relativePath: 'src/b.ts',
      extension: '.ts',
      name: 'b.ts',
    }];
    expect(facade._lastDiscoveredFiles).toEqual([
      { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts', extension: '.ts', name: 'b.ts' },
    ]);

    expect(refreshSource._lastFileAnalysis).toBe(facade._lastFileAnalysis);
    const nextAnalysis = new Map([['src/a.ts', { filePath: '/workspace/src/a.ts', relations: [] }]]);
    refreshSource._lastFileAnalysis = nextAnalysis;
    expect(facade._lastFileAnalysis).toBe(nextAnalysis);

    expect(refreshSource._lastFileConnections).toBe(facade._lastFileConnections);
    const nextConnections = new Map([[
      'src/a.ts',
      [{ kind: 'import', sourceId: 'source', specifier: './a', resolvedPath: '/workspace/src/a.ts' }],
    ]]) as never;
    refreshSource._lastFileConnections = nextConnections;
    expect(facade._lastFileConnections).toBe(nextConnections);

    expect(refreshSource._lastWorkspaceRoot).toBe('');
    refreshSource._lastWorkspaceRoot = '/workspace';
    expect(facade._lastWorkspaceRoot).toBe('/workspace');

    await refreshSource._readAnalysisFiles([{
      absolutePath: '/workspace/src/a.ts',
      relativePath: 'src/a.ts',
      extension: '.ts',
      name: 'a.ts',
    }]);
    expect(facade._readAnalysisFiles).toHaveBeenCalledWith([{
      absolutePath: '/workspace/src/a.ts',
      relativePath: 'src/a.ts',
      extension: '.ts',
      name: 'a.ts',
    }]);

    await refreshSource.analyze(['*.ts'], disabledPlugins, signal, onProgress);
    expect(facade.analyze).toHaveBeenCalledWith(['*.ts'], disabledPlugins, signal, onProgress);

    refreshSource.invalidateWorkspaceFiles(['/workspace/src/a.ts']);
    expect(facade.invalidateWorkspaceFiles).toHaveBeenCalledWith(['/workspace/src/a.ts']);
  });
});
