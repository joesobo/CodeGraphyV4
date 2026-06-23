import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { spawnSync } from 'node:child_process';
import { WorkspacePipelineDiscoveryFacade } from '../../../../src/extension/pipeline/service/discoveryFacade';
import type { Configuration } from '../../../../src/extension/config/reader';
import type { FileDiscovery } from '@codegraphy-dev/core';
import type { PluginRegistry } from '../../../../src/core/plugins/registry/manager';
import type { IWorkspaceAnalysisCache } from '../../../../src/extension/pipeline/cache';
import type { IDiscoveredFile } from '@codegraphy-dev/core';
import {
  createWorkspacePipelineDiscoveryDependencies,
  discoverWorkspacePipelineFilesWithWarnings,
} from '../../../../src/extension/pipeline/service/runtime/discovery';
import {
  getWorkspacePipelinePluginFilterPatterns,
  initializeWorkspacePipeline,
  syncWorkspacePipelinePlugins,
} from '../../../../src/extension/pipeline/plugins/bootstrap';
import { hasWorkspacePipelineIndex } from '../../../../src/extension/pipeline/service/cache/index';
import {
  analyzeWorkspacePipeline,
  rebuildWorkspacePipelineGraph,
} from '../../../../src/extension/pipeline/service/runtime/run';

vi.mock('../../../../src/extension/pipeline/service/runtime/discovery', () => ({
  createWorkspacePipelineDiscoveryDependencies: vi.fn(),
  discoverWorkspacePipelineFilesWithWarnings: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/plugins/bootstrap', () => ({
  initializeWorkspacePipeline: vi.fn(),
  syncWorkspacePipelinePlugins: vi.fn(),
  getWorkspacePipelinePluginFilterPatterns: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/cache/index', () => ({
  hasWorkspacePipelineIndex: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/service/runtime/run', () => ({
  analyzeWorkspacePipeline: vi.fn(),
  rebuildWorkspacePipelineGraph: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
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

function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve(value: T | PromiseLike<T>): void;
  reject(reason?: unknown): void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

class TestDiscoveryFacade extends WorkspacePipelineDiscoveryFacade {
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly clearCache = vi.fn();

  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = { files: {} } as unknown as IWorkspaceAnalysisCache;
  }

  _config = {
    getAll: vi.fn(() => ({ showOrphans: true, respectGitignore: true })),
  } as unknown as Configuration;

  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;
  _registry = {
    id: 'registry',
    list: vi.fn(() => []),
    disposeAll: vi.fn(),
  } as unknown as PluginRegistry;

  public override get _cache(): IWorkspaceAnalysisCache {
    return super._cache;
  }

  public override set _cache(cache: IWorkspaceAnalysisCache) {
    super._cache = cache;
  }

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }
}

describe('pipeline/service/discoveryFacade', () => {
  const discoveryState = (
    facade: TestDiscoveryFacade,
  ): {
    _lastDiscoveredDirectories: string[];
    _lastDiscoveredFiles: IDiscoveredFile[];
    _lastGitIgnoredPaths: string[];
    _lastWorkspaceRoot: string;
  } => facade as unknown as {
    _lastDiscoveredDirectories: string[];
    _lastDiscoveredFiles: IDiscoveredFile[];
    _lastGitIgnoredPaths: string[];
    _lastWorkspaceRoot: string;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(spawnSync).mockReturnValue({
      error: undefined,
      status: 1,
      stdout: '',
    } as never);
    vi.mocked(createWorkspacePipelineDiscoveryDependencies).mockReturnValue('discovery-deps' as never);
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValue({
      directories: ['src/new-folder'],
      files: [
        { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
        { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
      ],
      gitIgnoredPaths: ['example-python/app.py'],
    } as never);
    vi.mocked(getWorkspacePipelinePluginFilterPatterns).mockReturnValue(['plugin-filter']);
    vi.mocked(syncWorkspacePipelinePlugins).mockResolvedValue(undefined);
    vi.mocked(hasWorkspacePipelineIndex).mockReturnValue(true);
    vi.mocked(analyzeWorkspacePipeline).mockResolvedValue({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });
    vi.mocked(rebuildWorkspacePipelineGraph).mockReturnValue({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
  });

  it('initializes plugins with a workspace-root getter and logs completion', async () => {
    const facade = new TestDiscoveryFacade();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await facade.initialize();

    expect(initializeWorkspacePipeline).toHaveBeenCalledWith(facade._registry, {
      getWorkspaceRoot: expect.any(Function),
    });
    expect(vi.mocked(initializeWorkspacePipeline).mock.calls[0][1].getWorkspaceRoot()).toBe('/workspace');
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] WorkspacePipeline initialized');
  });

  it('serializes concurrent workspace plugin syncs without disposing unrelated plugins', async () => {
    const facade = new TestDiscoveryFacade();
    const firstReload = createDeferred();
    const secondReload = createDeferred();
    vi.mocked(syncWorkspacePipelinePlugins)
      .mockImplementationOnce(() => firstReload.promise)
      .mockImplementationOnce(() => secondReload.promise);

    const first = facade.syncWorkspacePlugins();
    const second = facade.syncWorkspacePlugins();

    await Promise.resolve();

    expect(syncWorkspacePipelinePlugins).toHaveBeenCalledTimes(1);
    expect(facade._registry.disposeAll).not.toHaveBeenCalled();

    firstReload.resolve(undefined);
    await first;
    await Promise.resolve();

    expect(syncWorkspacePipelinePlugins).toHaveBeenCalledTimes(2);
    expect(facade._registry.disposeAll).not.toHaveBeenCalled();

    secondReload.resolve(undefined);
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(syncWorkspacePipelinePlugins).toHaveBeenCalledWith(facade._registry, {
      getWorkspaceRoot: expect.any(Function),
    });
  });

  it('delegates plugin filters and index checks through the shared helpers', () => {
    const facade = new TestDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);

    expect(facade.getPluginFilterPatterns(disabledPlugins)).toEqual(['plugin-filter']);
    expect(getWorkspacePipelinePluginFilterPatterns).toHaveBeenCalledWith(facade._registry, disabledPlugins);

    expect(facade.hasIndex()).toBe(true);
    expect(hasWorkspacePipelineIndex).toHaveBeenCalledWith('/workspace');
  });

  it('returns an empty graph immediately when no workspace root exists', async () => {
    const facade = new TestDiscoveryFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(facade.discoverGraph()).resolves.toEqual({ nodes: [], edges: [] });

    expect(discoverWorkspacePipelineFilesWithWarnings).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith('[CodeGraphy] No workspace folder open');
  });

  it('discovers files with default filters, updates cached state, and builds graph data', async () => {
    const facade = new TestDiscoveryFacade();
    const buildGraphData = vi
      .spyOn(
        facade as unknown as {
          _buildGraphData: (...args: unknown[]) => unknown;
        },
        '_buildGraphData',
      )
      .mockReturnValue({ nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }], edges: [] });
    const disabledPlugins = new Set(['plugin.disabled']);

    const result = await facade.discoverGraph(undefined, disabledPlugins, new AbortController().signal);

    expect(result).toEqual({ nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }], edges: [] });
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      [],
      ['plugin-filter'],
      expect.any(AbortSignal),
      expect.any(Function),
    );

    const warn = vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mock.calls[0][6];
    warn('warning');
    expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('warning');

    expect(discoveryState(facade)._lastDiscoveredFiles).toEqual([
      { absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' },
      { absolutePath: '/workspace/src/b.ts', relativePath: 'src/b.ts' },
    ]);
    expect(discoveryState(facade)._lastDiscoveredDirectories).toEqual(['src/new-folder']);
    expect(discoveryState(facade)._lastGitIgnoredPaths).toEqual(['example-python/app.py']);
    expect(discoveryState(facade)._lastWorkspaceRoot).toBe('/workspace');
    expect(buildGraphData).toHaveBeenCalledWith(
      new Map([
        ['src/a.ts', []],
        ['src/b.ts', []],
      ]),
      '/workspace',
      true,
      disabledPlugins,
    );
  });

  it('keeps cold-cache discovered file nodes visible when Show Orphans is disabled', async () => {
    const facade = new TestDiscoveryFacade();
    vi.mocked(facade._config.getAll).mockReturnValue({
      showOrphans: false,
      respectGitignore: true,
    } as never);
    const buildGraphData = vi
      .spyOn(
        facade as unknown as {
          _buildGraphData: (...args: unknown[]) => unknown;
        },
        '_buildGraphData',
      )
      .mockReturnValue({
        nodes: [
          { id: 'src/a.ts', label: 'a.ts', color: '#333333' },
          { id: 'src/b.ts', label: 'b.ts', color: '#333333' },
        ],
        edges: [],
      });

    await expect(facade.discoverGraph()).resolves.toEqual({
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', color: '#333333' },
        { id: 'src/b.ts', label: 'b.ts', color: '#333333' },
      ],
      edges: [],
    });

    expect(buildGraphData).toHaveBeenCalledWith(
      new Map([
        ['src/a.ts', []],
        ['src/b.ts', []],
      ]),
      '/workspace',
      true,
      new Set<string>(),
    );
  });

  it('delegates analyze, rebuildGraph, and refreshIndex through the shared runners', async () => {
    const facade = new TestDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const analyzeSpy = vi.spyOn(facade, 'analyze');
    const persistIndexMetadata = vi
      .spyOn(
        facade as unknown as {
          _persistIndexMetadata: () => Promise<void>;
        },
        '_persistIndexMetadata',
      )
      .mockResolvedValue(undefined);

    await expect(facade.analyze(undefined, disabledPlugins, signal, onProgress)).resolves.toEqual({
      nodes: [{ id: 'analysis', label: 'Analysis', color: '#111111' }],
      edges: [],
    });
    expect(analyzeWorkspacePipeline).toHaveBeenCalledWith(
      facade,
      facade._cache,
      facade._config,
      facade._discovery,
      expect.any(Function),
      [],
      disabledPlugins,
      onProgress,
      signal,
      expect.any(Function),
    );
    expect(vi.mocked(analyzeWorkspacePipeline).mock.calls[0][4]()).toBe('/workspace');
    await vi.mocked(analyzeWorkspacePipeline).mock.calls[0][9]();
    expect(persistIndexMetadata).toHaveBeenCalledOnce();

    expect(facade.rebuildGraph(disabledPlugins, false)).toEqual({
      nodes: [{ id: 'rebuild', label: 'Rebuild', color: '#222222' }],
      edges: [],
    });
    expect(rebuildWorkspacePipelineGraph).toHaveBeenCalledWith(facade, disabledPlugins, false);

    analyzeSpy.mockResolvedValueOnce({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });
    const cacheBeforeRefresh = facade._cache;
    await expect(
      facade.refreshIndex(undefined, disabledPlugins, signal),
    ).resolves.toEqual({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });

    expect(facade.clearCache).not.toHaveBeenCalled();
    expect(facade._cache).not.toBe(cacheBeforeRefresh);
    expect(facade._cache.files).toEqual({});
    expect(analyzeSpy).toHaveBeenCalledWith([], disabledPlugins, signal, expect.any(Function));

    const refreshWithoutProgress = analyzeSpy.mock.calls[1][3] as (progress: {
      phase: string;
      current: number;
      total: number;
    }) => void;
    expect(() =>
      refreshWithoutProgress({ phase: 'Analyzing', current: 1, total: 2 }),
    ).not.toThrow();

    analyzeSpy.mockResolvedValueOnce({
      nodes: [{ id: 'refresh', label: 'Refresh', color: '#444444' }],
      edges: [],
    });
    await facade.refreshIndex(['*.tsx'], disabledPlugins, signal, onProgress);
    const forwardedProgress = analyzeSpy.mock.calls[2][3] as (progress: {
      phase: string;
      current: number;
      total: number;
    }) => void;
    forwardedProgress({ phase: 'Analyzing', current: 2, total: 5 });
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'Analyzing',
      current: 2,
      total: 5,
    });

    forwardedProgress({ phase: '', current: 3, total: 5 });
    expect(onProgress).toHaveBeenCalledWith({
      phase: 'Refreshing Index',
      current: 3,
      total: 5,
    });
  });

  it('loads cached graph data without clearing or reanalyzing the Graph Cache', async () => {
    const facade = new TestDiscoveryFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const cachedAnalysis = {
      filePath: '/workspace/src/nested/cached.ts',
      relations: [],
    };
    facade._cache = {
      version: 'test',
      files: {
        'src/nested/cached.ts': {
          mtime: 1,
          analysis: cachedAnalysis,
        },
      },
    } as never;
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValueOnce({
      files: [
        {
          absolutePath: '/workspace/src/nested/cached.ts',
          relativePath: 'src/nested/cached.ts',
        },
      ],
      gitIgnoredPaths: [],
    } as never);
    const buildGraphDataFromAnalysis = vi
      .spyOn(
        facade as unknown as {
          _buildGraphDataFromAnalysis: (...args: unknown[]) => unknown;
        },
        '_buildGraphDataFromAnalysis',
      )
      .mockReturnValue({
        nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
        edges: [],
      });

    await expect(
      facade.loadCachedGraph(['dist/**'], disabledPlugins, new AbortController().signal),
    ).resolves.toEqual({
      nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
      edges: [],
    });

    expect(facade.clearCache).not.toHaveBeenCalled();
    expect(analyzeWorkspacePipeline).not.toHaveBeenCalled();
    expect(buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      new Map([['src/nested/cached.ts', cachedAnalysis]]),
      '/workspace',
      true,
      disabledPlugins,
    );
    expect(discoveryState(facade)._lastDiscoveredFiles).toEqual([
      {
        absolutePath: '/workspace/src/nested/cached.ts',
        extension: '.ts',
        name: 'cached.ts',
        relativePath: 'src/nested/cached.ts',
      },
    ]);
    expect(discoveryState(facade)._lastDiscoveredDirectories).toEqual(['src', 'src/nested']);
  });

  it('loads cached graph data without walking the workspace again', async () => {
    const facade = new TestDiscoveryFacade();
    const cachedAnalysis = {
      filePath: '/workspace/src/nested/cached.ts',
      relations: [],
    };
    facade._cache = {
      version: 'test',
      files: {
        'src/nested/cached.ts': {
          mtime: 1,
          analysis: cachedAnalysis,
        },
      },
    } as never;
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockRejectedValueOnce(
      new Error('full discovery should not run for cached replay'),
    );
    vi.spyOn(
      facade as unknown as {
        _buildGraphDataFromAnalysis: (...args: unknown[]) => unknown;
      },
      '_buildGraphDataFromAnalysis',
    ).mockReturnValue({
      nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
      edges: [],
    });

    await expect(facade.loadCachedGraph()).resolves.toEqual({
      nodes: [{ id: 'src/nested/cached.ts', label: 'cached.ts', color: '#333333' }],
      edges: [],
    });

    expect(discoverWorkspacePipelineFilesWithWarnings).not.toHaveBeenCalled();
    expect(discoveryState(facade)._lastDiscoveredDirectories).toEqual(['src', 'src/nested']);
    expect(discoveryState(facade)._lastGitIgnoredPaths).toEqual([]);
  });

  it('applies current gitignore metadata when replaying cached graph data', async () => {
    const facade = new TestDiscoveryFacade();
    const cachedAnalysis = {
      filePath: '/workspace/example-python/src/main.py',
      relations: [],
    };
    facade._cache = {
      version: 'test',
      files: {
        'example-python/src/main.py': {
          mtime: 1,
          analysis: cachedAnalysis,
        },
      },
    } as never;
    vi.mocked(spawnSync).mockReturnValueOnce({
      error: undefined,
      status: 0,
      stdout: 'example-python/src/main.py\n',
    } as never);
    vi.spyOn(
      facade as unknown as {
        _buildGraphDataFromAnalysis: (...args: unknown[]) => unknown;
      },
      '_buildGraphDataFromAnalysis',
    ).mockReturnValue({
      nodes: [{ id: 'example-python/src/main.py', label: 'main.py', color: '#333333' }],
      edges: [],
    });

    await facade.loadCachedGraph();

    expect(discoverWorkspacePipelineFilesWithWarnings).not.toHaveBeenCalled();
    expect(spawnSync).toHaveBeenCalledWith(
      'git',
      ['-C', '/workspace', 'check-ignore', '--stdin'],
      {
        encoding: 'utf8',
        input: 'example-python\nexample-python/src\nexample-python/src/main.py\n',
      },
    );
    expect(discoveryState(facade)._lastGitIgnoredPaths).toEqual(['example-python/src/main.py']);
  });
});
