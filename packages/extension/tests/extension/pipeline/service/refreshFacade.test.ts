import { describe, expect, it, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import * as vscode from 'vscode';
import { WorkspacePipelineRefreshFacade } from '../../../../src/extension/pipeline/service/refreshFacade';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../src/extension/pipeline/service/runtime/discovery';
import {
  refreshWorkspacePipelineAnalysisScope,
  refreshWorkspacePipelineChangedFiles,
  refreshWorkspacePipelinePluginFiles,
} from '../../../../src/extension/pipeline/service/runtime/refresh';

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

class TestRefreshFacade extends WorkspacePipelineRefreshFacade {
  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._lastDiscoveredFiles = [] as never;
    this._lastFileAnalysis = new Map() as never;
    this._lastFileConnections = new Map() as never;
    this._lastWorkspaceRoot = '';
  }

  _config = {
    get: vi.fn((key: string, defaultValue: unknown) => {
      if (key === 'nodeVisibility') {
        return {};
      }
      return defaultValue;
    }),
    getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true })),
  } as never;

  _discovery = { kind: 'discovery' } as never;
  _registry = {
    list: vi.fn(() => [{ plugin: { id: 'plugin.a' } }]),
    notifyFilesChanged: vi.fn(async () => ({ additionalFilePaths: [], requiresFullRefresh: false })),
  } as never;

  public override get _lastDiscoveredFiles(): never {
    return super._lastDiscoveredFiles as never;
  }

  public override set _lastDiscoveredFiles(files: never) {
    super._lastDiscoveredFiles = files;
  }

  public override get _lastDiscoveredDirectories(): string[] {
    return super._lastDiscoveredDirectories;
  }

  public override set _lastDiscoveredDirectories(directories: string[]) {
    super._lastDiscoveredDirectories = directories;
  }

  public override get _lastGitIgnoredPaths(): string[] {
    return super._lastGitIgnoredPaths;
  }

  public override set _lastGitIgnoredPaths(gitIgnoredPaths: string[]) {
    super._lastGitIgnoredPaths = gitIgnoredPaths;
  }

  public override get _lastFileAnalysis(): never {
    return super._lastFileAnalysis as never;
  }

  public override set _lastFileAnalysis(fileAnalysis: never) {
    super._lastFileAnalysis = fileAnalysis;
  }

  public override get _lastFileConnections(): never {
    return super._lastFileConnections as never;
  }

  public override set _lastFileConnections(fileConnections: never) {
    super._lastFileConnections = fileConnections;
  }

  public override get _lastWorkspaceRoot(): string {
    return super._lastWorkspaceRoot;
  }

  public override set _lastWorkspaceRoot(workspaceRoot: string) {
    super._lastWorkspaceRoot = workspaceRoot;
  }

  public override get _lastGraphData(): never {
    return super._lastGraphData as never;
  }

  public override set _lastGraphData(graphData: never) {
    super._lastGraphData = graphData;
  }

  public override get _cache(): never {
    return super._cache as never;
  }

  public override set _cache(cache: never) {
    super._cache = cache;
  }

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
  _buildGraphData = vi.fn(() => ({ nodes: [], edges: [] })) as never;
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
      gitIgnoredPaths: ['example-python/app.py'],
    } as never);
    vi.mocked(refreshWorkspacePipelineChangedFiles).mockResolvedValue({
      nodes: [{ id: 'refresh' }],
      edges: [],
    } as never);
    vi.mocked(refreshWorkspacePipelineAnalysisScope).mockResolvedValue({
      nodes: [{ id: 'scope-refresh' }],
      edges: [],
    } as never);
    vi.mocked(refreshWorkspacePipelinePluginFiles).mockResolvedValue({
      nodes: [{ id: 'plugin-refresh' }],
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
    const workspaceState = (
      facade as unknown as {
        _context: { workspaceState: { get: ReturnType<typeof vi.fn> } };
      }
    )._context.workspaceState;
    workspaceState.get.mockImplementation((key: string) => {
      if (key === 'codegraphy.churn.index') {
        return {
          version: 1,
          head: 'abc123',
          fileSet: 'src/a.ts',
          counts: { 'src/a.ts': 7 },
        };
      }
      return undefined;
    });

    await facade.refreshChangedFiles(['/workspace/src/a.ts']);

    const [refreshSource] = vi.mocked(refreshWorkspacePipelineChangedFiles).mock.calls[0];
    expect(refreshSource._patchGraphDataNodeMetrics?.({
      nodes: [
        { color: '#fff', id: 'src/a.ts', label: 'a.ts', fileSize: 10, churn: 1 },
        {
          color: '#fff',
          id: 'src/a.ts#run:function',
          label: 'run',
          symbol: {
            filePath: 'src/a.ts',
            id: 'src/a.ts#run:function',
            kind: 'function',
            name: 'run',
          },
          fileSize: 10,
          churn: 1,
        },
        { color: '#fff', id: 'src/b.ts', label: 'b.ts', fileSize: 4, churn: 2 },
      ],
      edges: [],
    }, ['src/a.ts'])).toEqual({
      nodes: [
        { color: '#fff', id: 'src/a.ts', label: 'a.ts', fileSize: 12, churn: 7 },
        {
          color: '#fff',
          id: 'src/a.ts#run:function',
          label: 'run',
          symbol: {
            filePath: 'src/a.ts',
            id: 'src/a.ts#run:function',
            kind: 'function',
            name: 'run',
          },
          fileSize: 12,
          churn: 7,
        },
        { color: '#fff', id: 'src/b.ts', label: 'b.ts', fileSize: 4, churn: 2 },
      ],
      edges: [],
    });
  });

  it('builds delegated discovery and refresh dependencies for analysis-scope refreshes', async () => {
    const facade = new TestRefreshFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();

    const result = await facade.refreshAnalysisScope(
      ['dist/**'],
      disabledPlugins,
      signal,
      onProgress,
    );

    expect(result).toEqual({ nodes: [{ id: 'scope-refresh' }], edges: [] });
    expect(facade._lastGitIgnoredPaths).toEqual(['example-python/app.py']);
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      ['dist/**'],
      ['plugin-filter'],
      signal,
      expect.any(Function),
    );

    const [refreshSource, refreshDependencies] = vi.mocked(refreshWorkspacePipelineAnalysisScope).mock.calls[0];
    expect(refreshDependencies.disabledPlugins).toBe(disabledPlugins);
    expect(refreshDependencies.discoveredFiles).toEqual([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
    ]);
    expect(refreshDependencies.discoveredDirectories).toEqual([]);
    expect(refreshDependencies.onProgress).toBe(onProgress);
    expect(refreshDependencies.signal).toBe(signal);

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
  });

  it('uses empty filters by default for analysis-scope refreshes', async () => {
    const facade = new TestRefreshFacade();

    await facade.refreshAnalysisScope();

    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      [],
      ['plugin-filter'],
      undefined,
      expect.any(Function),
    );
  });

  it('builds delegated discovery and refresh dependencies for plugin-file refreshes', async () => {
    const facade = new TestRefreshFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();

    const result = await facade.refreshPluginFiles(
      ['plugin.a'],
      undefined,
      disabledPlugins,
      signal,
      onProgress,
    );

    expect(result).toEqual({ nodes: [{ id: 'plugin-refresh' }], edges: [] });
    expect(facade._lastGitIgnoredPaths).toEqual(['example-python/app.py']);
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      [],
      ['plugin-filter'],
      signal,
      expect.any(Function),
    );

    const [refreshSource, refreshDependencies] = vi.mocked(refreshWorkspacePipelinePluginFiles).mock.calls[0];
    expect(refreshDependencies.disabledPlugins).toBe(disabledPlugins);
    expect(refreshDependencies.discoveredDirectories).toEqual([]);
    expect(refreshDependencies.discoveredFiles).toEqual([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
    ]);
    expect(refreshDependencies.onProgress).toBe(onProgress);
    expect(refreshDependencies.pluginIds).toEqual(['plugin.a']);
    expect(refreshDependencies.pluginInfos).toEqual([{ plugin: { id: 'plugin.a' } }]);
    expect(refreshDependencies.signal).toBe(signal);
    expect(refreshDependencies.workspaceRoot).toBe('/workspace');

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
  });

  it('rebuilds analysis scope from tier-complete cached analysis without reanalyzing files', async () => {
    const facade = new TestRefreshFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const graphData = {
      nodes: [{ id: 'src/a.ts#run:function' }],
      edges: [],
    };
    facade._config = {
      get: vi.fn((key: string, defaultValue: unknown) => {
        if (key === 'nodeVisibility') {
          return { symbol: true, 'symbol:function': true };
        }
        return defaultValue;
      }),
      getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true })),
    } as never;
    facade._lastFileAnalysis = new Map([
      ['src/a.ts', {
        filePath: '/workspace/src/a.ts',
        relations: [],
        symbols: [{
          filePath: '/workspace/src/a.ts',
          id: '/workspace/src/a.ts:function:run',
          kind: 'function',
          name: 'run',
        }],
        cache: {
          tiers: ['baseline', 'symbols', 'plugin:plugin.a'],
        },
      }],
    ]) as never;
    facade._buildGraphDataFromAnalysis = vi.fn(() => graphData) as never;

    await expect(
      facade.refreshAnalysisScope(['dist/**'], disabledPlugins, signal, onProgress),
    ).resolves.toBe(graphData);

    expect(refreshWorkspacePipelineAnalysisScope).not.toHaveBeenCalled();
    expect(facade._lastDiscoveredFiles).toEqual([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
    ]);
    expect(facade._lastGitIgnoredPaths).toEqual(['example-python/app.py']);
    expect(facade._lastWorkspaceRoot).toBe('/workspace');
    expect(facade._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      facade._lastFileAnalysis,
      '/workspace',
      true,
      disabledPlugins,
    );
    expect(facade._persistCache).not.toHaveBeenCalled();
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      phase: 'Applying Scope',
      current: 0,
      total: 1,
    });
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      phase: 'Applying Scope',
      current: 1,
      total: 1,
    });
  });

  it('refreshes gitignore metadata by rebuilding from cached analysis without analyzing files', async () => {
    const facade = new TestRefreshFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    facade._lastFileAnalysis = new Map([
      ['example-python/src/main.py', { filePath: '/workspace/example-python/src/main.py', relations: [] }],
    ]) as never;
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValueOnce({
      directories: ['example-python', 'example-python/src'],
      files: [
        {
          absolutePath: '/workspace/example-python/src/main.py',
          relativePath: 'example-python/src/main.py',
        },
      ],
      gitIgnoredPaths: ['example-python/src/main.py'],
    } as never);
    facade._buildGraphDataFromAnalysis = vi.fn(() => ({
      nodes: [{
        color: '#64748B',
        id: 'example-python/src/main.py',
        label: 'main.py',
        metadata: { gitIgnored: true },
      }],
      edges: [],
    })) as never;

    await expect(
      facade.refreshGitignoreMetadata(undefined, disabledPlugins),
    ).resolves.toEqual({
      nodes: [{
        color: '#64748B',
        id: 'example-python/src/main.py',
        label: 'main.py',
        metadata: { gitIgnored: true },
      }],
      edges: [],
    });

    expect(facade._analyzeFiles).not.toHaveBeenCalled();
    expect(facade._lastGitIgnoredPaths).toEqual(['example-python/src/main.py']);
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      [],
      ['plugin-filter'],
      undefined,
      expect.any(Function),
    );
    expect(facade._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      facade._lastFileAnalysis,
      '/workspace',
      true,
      disabledPlugins,
    );
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
  });
});
