import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import {
  refreshAnalysisScopeForFacade,
} from '../../../../../../src/extension/pipeline/service/refresh/modes/analysisScope';
import type { RefreshFacadeContext } from '../../../../../../src/extension/pipeline/service/refresh/context';
import { refreshWorkspacePipelineAnalysisScope } from '../../../../../../src/extension/pipeline/service/runtime/refresh';
import {
  canReuseCurrentAnalysisForScope,
  rebuildAnalysisScopeFromCurrentAnalysis,
} from '../../../../../../src/extension/pipeline/service/refresh/scope';
import { createWorkspaceIndexRefreshSource } from '../../../../../../src/extension/pipeline/service/refresh/source';
import { discoverRefreshWorkspaceFiles } from '../../../../../../src/extension/pipeline/service/refresh/discovery/workspace';

vi.mock('../../../../../../src/extension/pipeline/service/runtime/refresh', () => ({
  refreshWorkspacePipelineAnalysisScope: vi.fn(),
}));

vi.mock('../../../../../../src/extension/pipeline/service/refresh/scope', () => ({
  canReuseCurrentAnalysisForScope: vi.fn(),
  rebuildAnalysisScopeFromCurrentAnalysis: vi.fn(),
}));

vi.mock('../../../../../../src/extension/pipeline/service/refresh/source', () => ({
  createWorkspaceIndexRefreshSource: vi.fn(),
}));

vi.mock('../../../../../../src/extension/pipeline/service/refresh/discovery/workspace', () => ({
  discoverRefreshWorkspaceFiles: vi.fn(),
}));

function createGraph(id: string): IGraphData {
  return {
    nodes: [{ id, label: id, color: '#67E8F9', nodeType: 'file' }],
    edges: [],
  };
}

function createFile(relativePath = 'src/a.ts') {
  return {
    absolutePath: `/workspace/${relativePath}`,
    extension: '.ts',
    name: relativePath.split('/').at(-1) ?? relativePath,
    relativePath,
  };
}

function createFacade(
  overrides: Partial<RefreshFacadeContext> = {},
): RefreshFacadeContext {
  return {
    _analyzeFiles: vi.fn(),
    _buildGraphData: vi.fn(),
    _buildGraphDataFromAnalysis: vi.fn(),
    _config: {
      get: vi.fn(() => ({ file: true })),
      getAll: vi.fn(),
    },
    _discovery: { discover: vi.fn() },
    _getActiveAnalysisPluginIds: vi.fn(() => ['plugin.a']),
    _getWorkspaceRoot: vi.fn(() => '/workspace'),
    _lastDiscoveredDirectories: [],
    _lastDiscoveredFiles: [],
    _lastFileAnalysis: new Map([['src/a.ts', { filePath: '/workspace/src/a.ts' }]]),
    _lastFileConnections: new Map(),
    _lastGitIgnoredPaths: ['old-ignore'],
    _lastGraphData: createGraph('last'),
    _lastWorkspaceRoot: '/workspace',
    _patchGraphDataNodeMetrics: vi.fn(),
    _persistCache: vi.fn(),
    _persistIndexMetadata: vi.fn(async () => undefined),
    _preAnalyzePlugins: vi.fn(),
    _readAnalysisFiles: vi.fn(),
    _registry: {
      list: vi.fn(() => []),
      notifyFilesChanged: vi.fn(),
    },
    _toWorkspaceRelativePath: vi.fn(),
    analyze: vi.fn(),
    getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
    invalidateWorkspaceFiles: vi.fn(),
    ...overrides,
  } as unknown as RefreshFacadeContext;
}

function mockDiscoveryResult(
  overrides: Partial<Awaited<ReturnType<typeof discoverRefreshWorkspaceFiles>>['discoveryResult']> = {},
  config: Record<string, unknown> = { showOrphans: false },
) {
  const files = [createFile()];
  vi.mocked(discoverRefreshWorkspaceFiles).mockResolvedValue({
    config,
    discoveryResult: {
      directories: ['src'],
      files,
      gitIgnoredPaths: ['ignored.ts'],
      ...overrides,
    },
  } as never);
  return files;
}

describe('extension/pipeline/service/refresh/modes/analysisScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspaceIndexRefreshSource).mockReturnValue('refresh-source' as never);
  });

  it('returns an empty graph without workspace discovery when no workspace is open', async () => {
    await expect(
      refreshAnalysisScopeForFacade(createFacade({
        _getWorkspaceRoot: vi.fn(() => undefined),
      }), {
        disabledPlugins: new Set(),
        filterPatterns: ['src/**'],
      }),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(discoverRefreshWorkspaceFiles).not.toHaveBeenCalled();
    expect(refreshWorkspacePipelineAnalysisScope).not.toHaveBeenCalled();
  });

  it('rebuilds the graph from reusable analysis for analysis scope changes', async () => {
    const graph = createGraph('rebuilt');
    const files = mockDiscoveryResult();
    const facade = createFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    vi.mocked(canReuseCurrentAnalysisForScope).mockReturnValue(true);
    vi.mocked(rebuildAnalysisScopeFromCurrentAnalysis).mockResolvedValue(graph);

    await expect(
      refreshAnalysisScopeForFacade(facade, {
        disabledPlugins,
        filterPatterns: ['src/**'],
        onProgress,
        signal,
      }),
    ).resolves.toBe(graph);

    expect(discoverRefreshWorkspaceFiles).toHaveBeenCalledWith({
      configReader: facade._config,
      disabledPlugins,
      discovery: facade._discovery,
      filterPatterns: ['src/**'],
      getPluginFilterPatterns: expect.any(Function),
      signal,
      workspaceRoot: '/workspace',
    });
    const getPluginFilterPatterns = vi.mocked(discoverRefreshWorkspaceFiles).mock.calls[0][0].getPluginFilterPatterns;
    expect(getPluginFilterPatterns(disabledPlugins)).toEqual(['plugin/**']);
    expect(facade.getPluginFilterPatterns).toHaveBeenCalledWith(disabledPlugins);
    expect(facade._lastGitIgnoredPaths).toEqual(['ignored.ts']);
    expect(facade._getActiveAnalysisPluginIds).toHaveBeenCalledWith(undefined, disabledPlugins);
    expect(canReuseCurrentAnalysisForScope).toHaveBeenCalledWith({
      activePluginIds: ['plugin.a'],
      disabledPlugins,
      discoveredFiles: files,
      lastFileAnalysis: facade._lastFileAnalysis,
    });
    expect(rebuildAnalysisScopeFromCurrentAnalysis).toHaveBeenCalledWith(facade, {
      disabledPlugins,
      discoveredDirectories: ['src'],
      discoveredFiles: files,
      onProgress,
      showOrphans: false,
      workspaceRoot: '/workspace',
    });
    expect(refreshWorkspacePipelineAnalysisScope).not.toHaveBeenCalled();
  });

  it('uses reusable analysis defaults when discovery omits optional scope fields', async () => {
    const graph = createGraph('rebuilt-defaults');
    const files = mockDiscoveryResult({
      directories: undefined,
      gitIgnoredPaths: undefined,
    }, {});
    const facade = createFacade();
    const disabledPlugins = new Set<string>();
    vi.mocked(canReuseCurrentAnalysisForScope).mockReturnValue(true);
    vi.mocked(rebuildAnalysisScopeFromCurrentAnalysis).mockResolvedValue(graph);

    await expect(
      refreshAnalysisScopeForFacade(facade, {
        disabledPlugins,
        filterPatterns: [],
      }),
    ).resolves.toBe(graph);

    expect(facade._lastGitIgnoredPaths).toEqual([]);
    expect(rebuildAnalysisScopeFromCurrentAnalysis).toHaveBeenCalledWith(facade, expect.objectContaining({
      discoveredDirectories: [],
      discoveredFiles: files,
      showOrphans: true,
    }));
  });

  it('runs a full analysis-scope refresh when current analysis cannot be reused', async () => {
    const graph = createGraph('refreshed');
    const files = mockDiscoveryResult({
      directories: undefined,
      gitIgnoredPaths: undefined,
    });
    const facade = createFacade();
    const disabledPlugins = new Set<string>();
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    vi.mocked(canReuseCurrentAnalysisForScope).mockReturnValue(false);
    vi.mocked(refreshWorkspacePipelineAnalysisScope).mockResolvedValue(graph);

    await expect(
      refreshAnalysisScopeForFacade(facade, {
        disabledPlugins,
        filterPatterns: ['src/**'],
        onProgress,
        signal,
      }),
    ).resolves.toBe(graph);

    expect(facade._lastGitIgnoredPaths).toEqual([]);
    expect(createWorkspaceIndexRefreshSource).toHaveBeenCalledWith(facade, disabledPlugins);
    expect(refreshWorkspacePipelineAnalysisScope).toHaveBeenCalledWith('refresh-source', {
      disabledPlugins,
      discoveredDirectories: [],
      discoveredFiles: files,
      onProgress,
      persistCache: expect.any(Function),
      persistIndexMetadata: expect.any(Function),
      signal,
      workspaceRoot: '/workspace',
    });

    const refreshOptions = vi.mocked(refreshWorkspacePipelineAnalysisScope).mock.calls[0][1];
    refreshOptions.persistCache();
    await refreshOptions.persistIndexMetadata();
    expect(facade._persistCache).toHaveBeenCalledOnce();
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
    expect(rebuildAnalysisScopeFromCurrentAnalysis).not.toHaveBeenCalled();
  });
});
