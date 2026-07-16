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
  discoverWorkspacePipelineFilesWithWarnings,
  refreshWorkspacePipelineAnalysisScope,
  setUpRefreshFacade,
} from './refreshFacadeFixture';

describe('pipeline/service/refreshFacade analysis scope', () => {
  beforeEach(setUpRefreshFacade);

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
});
