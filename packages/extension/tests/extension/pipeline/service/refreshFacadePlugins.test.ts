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
  refreshWorkspacePipelinePluginFiles,
  setUpRefreshFacade,
} from './refreshFacadeFixture';

describe('pipeline/service/refreshFacade plugin files', () => {
  beforeEach(setUpRefreshFacade);

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
});
