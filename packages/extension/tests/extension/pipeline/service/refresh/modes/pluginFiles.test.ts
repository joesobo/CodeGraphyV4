import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import {
  refreshPluginFilesForFacade,
} from '../../../../../../src/extension/pipeline/service/refresh/modes/pluginFiles';
import type { RefreshFacadeContext } from '../../../../../../src/extension/pipeline/service/refresh/context';
import { refreshWorkspacePipelinePluginFiles } from '../../../../../../src/extension/pipeline/service/runtime/refresh';
import { discoverRefreshWorkspaceFiles } from '../../../../../../src/extension/pipeline/service/refresh/discovery/workspace';
import { createWorkspaceIndexRefreshSource } from '../../../../../../src/extension/pipeline/service/refresh/source';

vi.mock('../../../../../../src/extension/pipeline/service/runtime/refresh', () => ({
  refreshWorkspacePipelinePluginFiles: vi.fn(),
}));

vi.mock('../../../../../../src/extension/pipeline/service/refresh/discovery/workspace', () => ({
  discoverRefreshWorkspaceFiles: vi.fn(),
}));

vi.mock('../../../../../../src/extension/pipeline/service/refresh/source', () => ({
  createWorkspaceIndexRefreshSource: vi.fn(),
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
      get: vi.fn(),
      getAll: vi.fn(),
    },
    _discovery: { discover: vi.fn() },
    _getActiveAnalysisPluginIds: vi.fn(() => []),
    _getWorkspaceRoot: vi.fn(() => '/workspace'),
    _lastDiscoveredDirectories: [],
    _lastDiscoveredFiles: [],
    _lastFileAnalysis: new Map(),
    _lastFileConnections: new Map(),
    _lastGitIgnoredPaths: ['old-ignore'],
    _lastGraphData: createGraph('last'),
    _lastWorkspaceRoot: '/workspace',
    _patchGraphDataNodeMetrics: vi.fn(),
    _persistCache: vi.fn(),
    _persistCachePatch: vi.fn(),
    _persistIndexMetadata: vi.fn(async () => undefined),
    _preAnalyzePlugins: vi.fn(),
    _readAnalysisFiles: vi.fn(),
    _registry: {
      list: vi.fn(() => [{ id: 'plugin.a', name: 'Plugin A' }]),
      notifyFilesChanged: vi.fn(),
    },
    _toWorkspaceRelativePath: vi.fn(),
    analyze: vi.fn(),
    getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
    invalidateWorkspaceFiles: vi.fn(),
    ...overrides,
  } as unknown as RefreshFacadeContext;
}

describe('extension/pipeline/service/refresh/modes/pluginFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspaceIndexRefreshSource).mockReturnValue('refresh-source' as never);
  });

  it('returns an empty graph without plugin discovery when no workspace is open', async () => {
    await expect(
      refreshPluginFilesForFacade(createFacade({
        _getWorkspaceRoot: vi.fn(() => undefined),
      }), {
        disabledPlugins: new Set(),
        filterPatterns: ['src/**'],
        pluginIds: ['plugin.a'],
      }),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(discoverRefreshWorkspaceFiles).not.toHaveBeenCalled();
    expect(refreshWorkspacePipelinePluginFiles).not.toHaveBeenCalled();
  });

  it('returns an empty graph without plugin discovery when no plugin ids are selected', async () => {
    await expect(
      refreshPluginFilesForFacade(createFacade(), {
        disabledPlugins: new Set(),
        filterPatterns: ['src/**'],
        pluginIds: [],
      }),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(discoverRefreshWorkspaceFiles).not.toHaveBeenCalled();
    expect(refreshWorkspacePipelinePluginFiles).not.toHaveBeenCalled();
  });

  it('refreshes selected plugin files with discovered workspace files', async () => {
    const graph = createGraph('plugin-files');
    const files = [createFile('src/plugin.ts')];
    const disabledPlugins = new Set(['plugin.disabled']);
    const pluginIds = ['plugin.a'];
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const facade = createFacade();
    vi.mocked(discoverRefreshWorkspaceFiles).mockResolvedValue({
      config: {},
      discoveryResult: {
        directories: undefined,
        files,
        gitIgnoredPaths: undefined,
      },
    } as never);
    vi.mocked(refreshWorkspacePipelinePluginFiles).mockResolvedValue(graph);

    await expect(
      refreshPluginFilesForFacade(facade, {
        disabledPlugins,
        filterPatterns: ['src/**'],
        onProgress,
        pluginIds,
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
    expect(facade._lastGitIgnoredPaths).toEqual([]);
    expect(createWorkspaceIndexRefreshSource).toHaveBeenCalledWith(facade, disabledPlugins);
    expect(facade._registry.list).toHaveBeenCalledOnce();
    expect(refreshWorkspacePipelinePluginFiles).toHaveBeenCalledWith('refresh-source', {
      disabledPlugins,
      discoveredDirectories: [],
      discoveredFiles: files,
      onProgress,
      persistCache: expect.any(Function),
      persistCachePatch: expect.any(Function),
      persistIndexMetadata: expect.any(Function),
      pluginIds,
      pluginInfos: [{ id: 'plugin.a', name: 'Plugin A' }],
      signal,
      workspaceRoot: '/workspace',
    });

    const refreshOptions = vi.mocked(refreshWorkspacePipelinePluginFiles).mock.calls[0][1];
    refreshOptions.persistCache();
    refreshOptions.persistCachePatch?.({
      deleteFilePaths: [],
      upsertFilePaths: ['src/plugin.ts'],
    });
    await refreshOptions.persistIndexMetadata();
    expect(facade._persistCache).toHaveBeenCalledOnce();
    expect(facade._persistCachePatch).toHaveBeenCalledWith({
      deleteFilePaths: [],
      upsertFilePaths: ['src/plugin.ts'],
    });
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
  });
});
