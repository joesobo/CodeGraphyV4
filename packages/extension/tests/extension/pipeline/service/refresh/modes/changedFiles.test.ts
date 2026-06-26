import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import {
  refreshChangedFilesForFacade,
} from '../../../../../../src/extension/pipeline/service/refresh/modes/changedFiles';
import type { RefreshFacadeContext } from '../../../../../../src/extension/pipeline/service/refresh/context';
import { refreshWorkspacePipelineChangedFiles } from '../../../../../../src/extension/pipeline/service/runtime/refresh';
import { getReusableChangedFileDiscoveryState } from '../../../../../../src/extension/pipeline/service/refresh/discovery/changed';
import { discoverRefreshWorkspaceFiles } from '../../../../../../src/extension/pipeline/service/refresh/discovery/workspace';
import { createWorkspaceIndexRefreshSource } from '../../../../../../src/extension/pipeline/service/refresh/source';

vi.mock('../../../../../../src/extension/pipeline/service/runtime/refresh', () => ({
  refreshWorkspacePipelineChangedFiles: vi.fn(),
}));

vi.mock('../../../../../../src/extension/pipeline/service/refresh/discovery/changed', () => ({
  getReusableChangedFileDiscoveryState: vi.fn(),
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
    _lastDiscoveredDirectories: ['src'],
    _lastDiscoveredFiles: [createFile()],
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
      list: vi.fn(() => []),
      notifyFilesChanged: vi.fn(),
    },
    _toWorkspaceRelativePath: vi.fn((_root, filePath) => filePath.replace('/workspace/', '')),
    analyze: vi.fn(),
    getPluginFilterPatterns: vi.fn(() => ['plugin/**']),
    invalidateWorkspaceFiles: vi.fn(),
    ...overrides,
  } as unknown as RefreshFacadeContext;
}

describe('extension/pipeline/service/refresh/modes/changedFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspaceIndexRefreshSource).mockReturnValue('refresh-source' as never);
  });

  it('returns an empty graph without changed-file discovery when no workspace is open', async () => {
    await expect(
      refreshChangedFilesForFacade(createFacade({
        _getWorkspaceRoot: vi.fn(() => undefined),
      }), {
        disabledPlugins: new Set(),
        filePaths: ['src/a.ts'],
        filterPatterns: ['src/**'],
      }),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(getReusableChangedFileDiscoveryState).not.toHaveBeenCalled();
    expect(refreshWorkspacePipelineChangedFiles).not.toHaveBeenCalled();
  });

  it('refreshes changed files from reusable discovery state', async () => {
    const graph = createGraph('changed');
    const files = [createFile()];
    const directories = ['src', 'src/nested'];
    const disabledPlugins = new Set(['plugin.disabled']);
    const explicitDisabledPlugins = new Set(['plugin.next']);
    const signal = new AbortController().signal;
    const onProgress = vi.fn();
    const facade = createFacade();
    vi.mocked(getReusableChangedFileDiscoveryState).mockReturnValue({ directories, files });
    vi.mocked(refreshWorkspacePipelineChangedFiles).mockResolvedValue(graph);

    await expect(
      refreshChangedFilesForFacade(facade, {
        disabledPlugins,
        filePaths: ['src/a.ts'],
        filterPatterns: ['src/**'],
        onProgress,
        signal,
      }),
    ).resolves.toBe(graph);

    expect(getReusableChangedFileDiscoveryState).toHaveBeenCalledWith({
      filePaths: ['src/a.ts'],
      lastDiscoveredDirectories: facade._lastDiscoveredDirectories,
      lastDiscoveredFiles: facade._lastDiscoveredFiles,
      lastWorkspaceRoot: facade._lastWorkspaceRoot,
      toWorkspaceRelativePath: expect.any(Function),
      workspaceRoot: '/workspace',
    });
    const toWorkspaceRelativePath = vi.mocked(getReusableChangedFileDiscoveryState).mock.calls[0][0].toWorkspaceRelativePath;
    expect(toWorkspaceRelativePath('/workspace', '/workspace/src/a.ts')).toBe('src/a.ts');
    expect(facade._toWorkspaceRelativePath).toHaveBeenCalledWith('/workspace', '/workspace/src/a.ts');
    expect(discoverRefreshWorkspaceFiles).not.toHaveBeenCalled();
    expect(createWorkspaceIndexRefreshSource).toHaveBeenCalledWith(facade, disabledPlugins);
    expect(refreshWorkspacePipelineChangedFiles).toHaveBeenCalledWith('refresh-source', {
      deferMetricOnlyIndexMetadata: true,
      disabledPlugins,
      discoveredDirectories: directories,
      discoveredFiles: files,
      filePaths: ['src/a.ts'],
      filterPatterns: ['src/**'],
      notifyFilesChanged: expect.any(Function),
      onDeferredIndexMetadataError: expect.any(Function),
      onProgress,
      persistCache: expect.any(Function),
      persistCachePatch: expect.any(Function),
      persistIndexMetadata: expect.any(Function),
      signal,
      workspaceRoot: '/workspace',
    });

    const refreshOptions = vi.mocked(refreshWorkspacePipelineChangedFiles).mock.calls[0][1];
    refreshOptions.notifyFilesChanged(['src/a.ts'] as never, '/workspace', 'analysis-context' as never);
    expect(facade._registry.notifyFilesChanged).toHaveBeenCalledWith(
      ['src/a.ts'],
      '/workspace',
      'analysis-context',
      disabledPlugins,
    );
    refreshOptions.notifyFilesChanged(['src/b.ts'] as never, '/workspace', 'next-context' as never, explicitDisabledPlugins);
    expect(facade._registry.notifyFilesChanged).toHaveBeenLastCalledWith(
      ['src/b.ts'],
      '/workspace',
      'next-context',
      explicitDisabledPlugins,
    );

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = new Error('persist failed');
    expect(refreshOptions.onDeferredIndexMetadataError).toBeDefined();
    refreshOptions.onDeferredIndexMetadataError?.(error);
    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to persist metric-only refresh metadata.',
      error,
    );
    warn.mockRestore();

    refreshOptions.persistCache();
    refreshOptions.persistCachePatch?.({
      deleteFilePaths: ['src/deleted.ts'],
      upsertFilePaths: ['src/a.ts'],
    });
    await refreshOptions.persistIndexMetadata();
    expect(facade._persistCache).toHaveBeenCalledOnce();
    expect(facade._persistCachePatch).toHaveBeenCalledWith({
      deleteFilePaths: ['src/deleted.ts'],
      upsertFilePaths: ['src/a.ts'],
    });
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
  });

  it('discovers workspace files when previous changed-file discovery cannot be reused', async () => {
    const graph = createGraph('discovered');
    const files = [createFile('src/new.ts')];
    const disabledPlugins = new Set<string>();
    const signal = new AbortController().signal;
    const facade = createFacade();
    vi.mocked(getReusableChangedFileDiscoveryState).mockReturnValue(undefined);
    vi.mocked(discoverRefreshWorkspaceFiles).mockResolvedValue({
      config: {},
      discoveryResult: {
        directories: undefined,
        files,
        gitIgnoredPaths: undefined,
      },
    } as never);
    vi.mocked(refreshWorkspacePipelineChangedFiles).mockResolvedValue(graph);

    await expect(
      refreshChangedFilesForFacade(facade, {
        disabledPlugins,
        filePaths: ['src/new.ts'],
        filterPatterns: ['src/**'],
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
    expect(facade._lastDiscoveredDirectories).toEqual([]);
    expect(facade._lastGitIgnoredPaths).toEqual([]);
    expect(refreshWorkspacePipelineChangedFiles).toHaveBeenCalledWith('refresh-source', expect.objectContaining({
      discoveredDirectories: [],
      discoveredFiles: files,
      workspaceRoot: '/workspace',
    }));
  });
});
