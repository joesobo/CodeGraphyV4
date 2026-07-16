import { describe, expect, it, vi, beforeEach } from 'vitest';
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

vi.mock('node:child_process', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:child_process')>()),
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

import {
  TestDiscoveryFacade,
  discoveryState,
  discoverWorkspacePipelineFilesWithWarnings,
  analyzeWorkspacePipeline,
  setUpDiscoveryFacade,
} from './discoveryFacadeFixture';

describe('pipeline/service/discoveryFacade cache replay', () => {
  beforeEach(setUpDiscoveryFacade);

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
});
