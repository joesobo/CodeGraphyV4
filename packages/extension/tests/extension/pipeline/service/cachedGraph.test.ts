import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BASELINE_ANALYSIS_CACHE_TIER,
  SYMBOLS_ANALYSIS_CACHE_TIER,
  type AnalysisCacheTier,
  hasRequiredAnalysisCacheTiers,
  projectFileAnalysisConnections,
  throwIfWorkspaceAnalysisAborted,
  type FileDiscovery,
  type IDiscoveredFile,
} from '@codegraphy-dev/core';
import type { WorkspacePluginRegistry } from '../../../../src/extension/pipeline/plugins/registry';
import type { Configuration } from '../../../../src/extension/config/reader';
import { WorkspacePipelineCachedGraphFacade } from '../../../../src/extension/pipeline/service/cachedGraph';
import { createCachedWorkspaceDiscoveryState } from '../../../../src/extension/pipeline/service/cache/cachedDiscovery';

vi.mock('@codegraphy-dev/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codegraphy-dev/core')>();
  return {
    ...actual,
    hasRequiredAnalysisCacheTiers: vi.fn(),
    projectFileAnalysisConnections: vi.fn(),
    throwIfWorkspaceAnalysisAborted: vi.fn(),
  };
});

vi.mock('../../../../src/extension/pipeline/service/cache/cachedDiscovery', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/extension/pipeline/service/cache/cachedDiscovery')>()),
  createCachedWorkspaceDiscoveryState: vi.fn(),
}));
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({ get: vi.fn(), inspect: vi.fn(), update: vi.fn() })),
  },
}));

const cachedAnalysis = { filePath: '/workspace/src/cached.ts', imports: [], relations: [], symbols: [] };
const readmeAnalysis = { filePath: '/workspace/README.md', imports: [], relations: [], symbols: [] };
const cachedFiles: IDiscoveredFile[] = [{
  absolutePath: '/workspace/src/cached.ts',
  relativePath: 'src/cached.ts',
}] as never;
const mixedCachedFiles: IDiscoveredFile[] = [
  ...cachedFiles,
  {
    absolutePath: '/workspace/README.md',
    relativePath: 'README.md',
  },
] as never;

class TestCachedGraphFacade extends WorkspacePipelineCachedGraphFacade {
  readonly getWorkspaceRoot = vi.fn<() => string | undefined>(() => '/workspace');
  readonly hydrateCacheFromGraphCache = vi.fn(async (
    _options?: { activeAnalysisCacheTiers?: readonly AnalysisCacheTier[] },
  ) => undefined);
  readonly activeAnalysisPluginIds = vi.fn((
    _pluginIds: readonly string[] | undefined, _disabledPlugins: ReadonlySet<string>,
  ) => ['plugin.active']);
  readonly buildGraphDataFromAnalysis = vi.fn((
    _fileAnalysis: Map<string, never>, _workspaceRoot: string, _showOrphans: boolean, _disabledPlugins: Set<string>,
  ) => ({ nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }], edges: [] }));

  constructor() {
    super({
      subscriptions: [],
      workspaceState: {
        get: vi.fn(),
        update: vi.fn(),
      },
    } as never);
    this._cache = {
      files: {
        'src/cached.ts': { analysis: cachedAnalysis, mtime: 1, size: 10 },
      },
    } as never;
  }

  _config = {
    get: vi.fn((key: string, defaultValue: unknown) =>
      key === 'nodeVisibility' ? { symbol: true, 'symbol:function': true } : defaultValue,
    ),
    getAll: vi.fn(() => ({ respectGitignore: true, showOrphans: false })),
  } as unknown as Configuration;

  _discovery = { kind: 'discovery' } as unknown as FileDiscovery;
  _registry = {
    list: vi.fn(() => []),
  } as unknown as WorkspacePluginRegistry;

  protected override _getWorkspaceRoot(): string | undefined {
    return this.getWorkspaceRoot();
  }

  protected override async _hydrateCacheFromGraphCache(
    options?: { activeAnalysisCacheTiers?: readonly AnalysisCacheTier[] },
  ): Promise<void> {
    await this.hydrateCacheFromGraphCache(options);
  }

  protected override _getActiveAnalysisPluginIds(
    pluginIds: readonly string[] | undefined,
    disabledPlugins: ReadonlySet<string>,
  ): string[] {
    return this.activeAnalysisPluginIds(pluginIds, disabledPlugins);
  }

  protected override _buildGraphDataFromAnalysis(
    fileAnalysis: Map<string, never>,
    workspaceRoot: string,
    showOrphans: boolean,
    disabledPlugins: Set<string>,
  ) {
    return this.buildGraphDataFromAnalysis(fileAnalysis, workspaceRoot, showOrphans, disabledPlugins);
  }
}

interface CachedGraphState {
  _cache: unknown;
  _lastDiscoveredDirectories: string[];
  _lastDiscoveredFiles: IDiscoveredFile[];
  _lastFileAnalysis: Map<string, unknown>;
  _lastFileConnections: Map<string, unknown>;
  _lastGitIgnoredPaths: string[];
  _lastWorkspaceRoot: string;
}

function cachedGraphState(facade: TestCachedGraphFacade): CachedGraphState {
  return facade as unknown as CachedGraphState;
}

function setCachedGraphCache(facade: TestCachedGraphFacade, cache: unknown): void {
  cachedGraphState(facade)._cache = cache;
}

function setupCachedDiscovery(files: readonly IDiscoveredFile[] = cachedFiles): Map<string, never[]> {
  const projectedConnections = new Map<string, never[]>(
    files.map(file => [file.relativePath, []]),
  );

  vi.mocked(projectFileAnalysisConnections).mockReturnValue(projectedConnections as never);
  vi.mocked(createCachedWorkspaceDiscoveryState).mockReturnValue({
    directories: ['src'],
    files: [...files],
    gitIgnoredPaths: [],
  });
  return projectedConnections;
}

describe('extension/pipeline/service/cachedGraph', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasRequiredAnalysisCacheTiers).mockReturnValue(true);
    setupCachedDiscovery();
  });

  it('returns an empty graph after hydration when no workspace is open', async () => {
    const facade = new TestCachedGraphFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);

    await expect(facade.loadCachedGraph()).resolves.toEqual({ nodes: [], edges: [] });

    expect(facade.hydrateCacheFromGraphCache).toHaveBeenCalledOnce();
    expect(facade._config.getAll).not.toHaveBeenCalled();
    expect(createCachedWorkspaceDiscoveryState).not.toHaveBeenCalled();
  });

  it('replays cached analysis into graph state', async () => {
    const facade = new TestCachedGraphFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const projectedConnections = setupCachedDiscovery();

    await expect(
      facade.loadCachedGraph(['ignored'], disabledPlugins, signal),
    ).resolves.toEqual({
      nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }],
      edges: [],
    });

    expect(throwIfWorkspaceAnalysisAborted).toHaveBeenCalledWith(signal);
    expect(facade.hydrateCacheFromGraphCache).toHaveBeenCalledWith({
      activeAnalysisCacheTiers: [
        BASELINE_ANALYSIS_CACHE_TIER,
        SYMBOLS_ANALYSIS_CACHE_TIER,
        'plugin:plugin.active',
      ],
    });
    expect(createCachedWorkspaceDiscoveryState).toHaveBeenCalledWith(
      '/workspace',
      ['src/cached.ts'],
    );
    expect(projectFileAnalysisConnections).toHaveBeenCalledWith(
      new Map([['src/cached.ts', cachedAnalysis]]),
      '/workspace',
    );
    const retainedState = cachedGraphState(facade);
    expect(retainedState._lastDiscoveredFiles).toEqual(cachedFiles);
    expect(retainedState._lastDiscoveredDirectories).toEqual(['src']);
    expect(retainedState._lastGitIgnoredPaths).toEqual([]);
    expect(retainedState._lastFileAnalysis).toEqual(new Map([['src/cached.ts', cachedAnalysis]]));
    expect(retainedState._lastFileConnections).toBe(projectedConnections);
    expect(retainedState._lastWorkspaceRoot).toBe('/workspace');
    expect(facade.buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      new Map([['src/cached.ts', cachedAnalysis]]),
      '/workspace',
      false,
      disabledPlugins,
    );

  });

  it('returns an empty graph without mutating retained graph state when required cache tiers are missing', async () => {
    const facade = new TestCachedGraphFacade();
    vi.mocked(hasRequiredAnalysisCacheTiers).mockReturnValueOnce(false);

    await expect(
      facade.loadCachedGraph([], new Set(), undefined, {
        requiredAnalysisCacheTiers: ['baseline', 'symbols'],
      }),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(hasRequiredAnalysisCacheTiers).toHaveBeenCalledWith(
      cachedAnalysis,
      ['baseline', 'symbols'],
    );
    expect(projectFileAnalysisConnections).not.toHaveBeenCalled();
    expect(facade.buildGraphDataFromAnalysis).not.toHaveBeenCalled();
    const retainedState = cachedGraphState(facade);
    expect(retainedState._lastFileAnalysis).toEqual(new Map());
    expect(retainedState._lastFileConnections).toEqual(new Map());
  });

  it('requires plugin cache tiers only on files owned by that plugin', async () => {
    const facade = new TestCachedGraphFacade();
    setCachedGraphCache(facade, {
      files: {
        'src/cached.ts': { analysis: cachedAnalysis, mtime: 1, size: 10 },
        'README.md': { analysis: readmeAnalysis, mtime: 1, size: 10 },
      },
    });
    vi.mocked(facade._registry.list).mockReturnValue([{
      plugin: {
        id: 'codegraphy.typescript',
        supportedExtensions: ['.ts'],
      },
    }] as never);
    vi.mocked(hasRequiredAnalysisCacheTiers).mockImplementation((analysis, tiers) =>
      analysis === cachedAnalysis
      || !tiers?.some(tier => tier === 'plugin:codegraphy.typescript'),
    );
    setupCachedDiscovery(mixedCachedFiles);

    await expect(
      facade.loadCachedGraph([], new Set(), undefined, {
        requiredAnalysisCacheTiers: ['baseline', 'plugin:codegraphy.typescript'],
      }),
    ).resolves.toEqual({
      nodes: [{ id: 'graph', label: 'Graph', color: '#333333' }],
      edges: [],
    });

    expect(hasRequiredAnalysisCacheTiers).not.toHaveBeenCalledWith(
      readmeAnalysis,
      ['plugin:codegraphy.typescript'],
    );
    expect(facade.buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      new Map([
        ['src/cached.ts', cachedAnalysis],
        ['README.md', readmeAnalysis],
      ]),
      '/workspace',
      false,
      new Set<string>(),
    );
  });

  it('hydrates baseline and symbol tiers when plugin analysis is inactive', async () => {
    const facade = new TestCachedGraphFacade();
    facade.activeAnalysisPluginIds.mockReturnValue([]);

    await facade.loadCachedGraph();

    expect(facade.hydrateCacheFromGraphCache).toHaveBeenCalledWith({
      activeAnalysisCacheTiers: [BASELINE_ANALYSIS_CACHE_TIER, SYMBOLS_ANALYSIS_CACHE_TIER],
    });
  });

});
