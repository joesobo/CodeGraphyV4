import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../../../../src/extension/pipeline/service/runtime/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/runtime/refresh', () => ({
  refreshWorkspacePipelineAnalysisScope: vi.fn(),
  refreshWorkspacePipelineChangedFiles: vi.fn(),
  refreshWorkspacePipelinePluginFiles: vi.fn(),
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

import {
  TestRefreshFacade,
  fs,
  vscode,
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
  refreshWorkspacePipelineChangedFiles,
  setUpRefreshFacade,
} from './refreshFacadeFixture';

describe('pipeline/service/refreshFacade changed files', () => {
  beforeEach(setUpRefreshFacade);

  it('returns an empty graph immediately when no workspace root is available', async () => {
    const facade = new TestRefreshFacade();
    facade._getWorkspaceRoot.mockReturnValue(undefined as never);

    await expect(facade.refreshChangedFiles(['/workspace/src/a.ts'])).resolves.toEqual({
      nodes: [],
      edges: [],
    });

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
    expect(facade._lastGitIgnoredPaths).toEqual(['example-python/app.py']);
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

    expect('config' in refreshDependencies).toBe(false);
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
      undefined,
      disabledPlugins,
    );

    refreshDependencies.persistCache();
    expect(facade._persistCache).toHaveBeenCalledOnce();

    await refreshDependencies.persistIndexMetadata();
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();

    await refreshSource._analyzeFiles([], '/workspace', undefined, signal);
    expect(facade._analyzeFiles).toHaveBeenCalledWith(
      [],
      '/workspace',
      undefined,
      signal,
      undefined,
      disabledPlugins,
    );

    refreshSource._buildGraphData(new Map(), '/workspace', disabledPlugins);
    expect(facade._buildGraphData).toHaveBeenCalledWith(new Map(), '/workspace', true, disabledPlugins);

    refreshSource._buildGraphDataFromAnalysis(new Map(), '/workspace', disabledPlugins);
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

  it('reuses the current discovered files for existing changed files', async () => {
    const facade = new TestRefreshFacade();
    facade._lastWorkspaceRoot = '/workspace';
    facade._lastDiscoveredDirectories = ['src'];
    facade._lastDiscoveredFiles = [
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        extension: '.ts',
        name: 'a.ts',
      },
    ] as never;
    vi.spyOn(fs, 'existsSync').mockImplementation(filePath => filePath === '/workspace/src/a.ts');

    await facade.refreshChangedFiles(['/workspace/src/a.ts']);

    expect(discoverWorkspacePipelineFilesWithWarnings).not.toHaveBeenCalled();
    const [, refreshDependencies] = vi.mocked(refreshWorkspacePipelineChangedFiles).mock.calls[0];
    expect(refreshDependencies.discoveredDirectories).toEqual(['src']);
    expect(refreshDependencies.discoveredFiles).toEqual([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        extension: '.ts',
        name: 'a.ts',
      },
    ]);
  });

  it('patches delegated graph metrics for file and symbol nodes', async () => {
    const facade = new TestRefreshFacade();
    facade._cache = {
      files: {
        'src/a.ts': { size: 12 },
      },
    } as never;
    facade._registry = {
      notifyFilesChanged: vi.fn(async () => ({ additionalFilePaths: [], requiresFullRefresh: false })),
      list: vi.fn(() => [{ plugin: { id: 'plugin.a', version: '1.0.0' } }]),
    } as never;
    await facade.refreshChangedFiles(['/workspace/src/a.ts']);

    const [refreshSource] = vi.mocked(refreshWorkspacePipelineChangedFiles).mock.calls[0];
    expect(refreshSource._patchGraphDataNodeMetrics?.({
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', fileSize: 10 },
        {
          id: 'src/a.ts#run:function',
          label: 'run',
          symbol: {
            filePath: 'src/a.ts',
            id: 'src/a.ts#run:function',
            kind: 'function',
            name: 'run',
          },
          fileSize: 10,
        },
        { id: 'src/b.ts', label: 'b.ts', fileSize: 4 },
      ],
      edges: [],
    }, ['src/a.ts'])).toEqual({
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', fileSize: 12 },
        {
          id: 'src/a.ts#run:function',
          label: 'run',
          symbol: {
            filePath: 'src/a.ts',
            id: 'src/a.ts#run:function',
            kind: 'function',
            name: 'run',
          },
          fileSize: 12,
        },
        { id: 'src/b.ts', label: 'b.ts', fileSize: 4 },
      ],
      edges: [],
    });
  });
});
