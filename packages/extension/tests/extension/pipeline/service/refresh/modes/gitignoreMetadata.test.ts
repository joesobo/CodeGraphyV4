import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IGraphData } from '../../../../../../src/shared/graph/contracts';
import {
  refreshGitignoreMetadataForFacade,
} from '../../../../../../src/extension/pipeline/service/refresh/modes/gitignoreMetadata';
import type { RefreshFacadeContext } from '../../../../../../src/extension/pipeline/service/refresh/context';
import { discoverRefreshWorkspaceFiles } from '../../../../../../src/extension/pipeline/service/refresh/discovery/workspace';

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
    _cache: {
      files: {
        'src/a.ts': {
          analysis: { filePath: '/workspace/src/a.ts' },
          mtime: 1,
        },
      },
    },
    _analyzeFiles: vi.fn(),
    _buildGraphData: vi.fn(),
    _buildGraphDataFromAnalysis: vi.fn(() => createGraph('rebuilt')),
    _config: {
      get: vi.fn(),
      getAll: vi.fn(),
    },
    _discovery: { discover: vi.fn() },
    _getActiveAnalysisPluginIds: vi.fn(() => []),
    _getWorkspaceRoot: vi.fn(() => '/workspace'),
    _lastDiscoveredDirectories: ['old-src'],
    _lastDiscoveredFiles: [createFile('old.ts')],
    _lastFileAnalysis: new Map([['src/a.ts', { filePath: '/workspace/src/a.ts' }]]),
    _lastFileConnections: new Map([['src/a.ts', [{ from: 'src/a.ts', to: 'src/b.ts' }]]]),
    _lastGitIgnoredPaths: ['old-ignore'],
    _lastGraphData: createGraph('last'),
    _lastWorkspaceRoot: '/old-workspace',
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

describe('extension/pipeline/service/refresh/modes/gitignoreMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty graph without metadata discovery when no workspace is open', async () => {
    await expect(
      refreshGitignoreMetadataForFacade(createFacade({
        _getWorkspaceRoot: vi.fn(() => undefined),
      }), {
        disabledPlugins: new Set(),
        filterPatterns: ['src/**'],
      }),
    ).resolves.toEqual({ nodes: [], edges: [] });

    expect(discoverRefreshWorkspaceFiles).not.toHaveBeenCalled();
  });

  it('updates retained gitignore discovery state and rebuilds graph data', async () => {
    const graph = createGraph('gitignore');
    const files = [createFile('src/new.ts')];
    const disabledPlugins = new Set(['plugin.disabled']);
    const signal = new AbortController().signal;
    const persistError = new Error('metadata failed');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const facade = createFacade({
      _buildGraphDataFromAnalysis: vi.fn(() => graph),
      _persistIndexMetadata: vi.fn(async () => {
        throw persistError;
      }),
    });
    vi.mocked(discoverRefreshWorkspaceFiles).mockResolvedValue({
      config: { showOrphans: false },
      discoveryResult: {
        directories: undefined,
        files,
        gitIgnoredPaths: undefined,
      },
    } as never);

    await expect(
      refreshGitignoreMetadataForFacade(facade, {
        disabledPlugins,
        filterPatterns: ['src/**'],
        signal,
      }),
    ).resolves.toBe(graph);
    await Promise.resolve();

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
    expect(facade._lastDiscoveredFiles).toBe(files);
    expect(facade._lastGitIgnoredPaths).toEqual([]);
    expect(facade._lastWorkspaceRoot).toBe('/workspace');
    expect(facade._lastFileAnalysis).toEqual(new Map());
    expect(facade._lastFileConnections).toEqual(new Map());
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to persist gitignore metadata refresh.',
      persistError,
    );
    expect(facade._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      new Map(),
      '/workspace',
      false,
      disabledPlugins,
    );
    warn.mockRestore();
  });
});
