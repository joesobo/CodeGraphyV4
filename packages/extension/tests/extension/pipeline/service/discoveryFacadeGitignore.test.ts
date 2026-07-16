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
  spawnSync,
  discoverWorkspacePipelineFilesWithWarnings,
  setUpDiscoveryFacade,
} from './discoveryFacadeFixture';

describe('pipeline/service/discoveryFacade gitignore replay', () => {
  beforeEach(setUpDiscoveryFacade);

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

  it('can defer current gitignore metadata while replaying stale cached graph data', async () => {
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
    vi.spyOn(
      facade as unknown as {
        _buildGraphDataFromAnalysis: (...args: unknown[]) => unknown;
      },
      '_buildGraphDataFromAnalysis',
    ).mockReturnValue({
      nodes: [{ id: 'example-python/src/main.py', label: 'main.py', color: '#333333' }],
      edges: [],
    });

    await facade.loadCachedGraph(
      [],
      new Set<string>(),
      undefined,
      { includeCurrentGitignoreMetadata: false },
    );

    expect(spawnSync).not.toHaveBeenCalled();
    expect(discoveryState(facade)._lastGitIgnoredPaths).toEqual([]);
  });
});
