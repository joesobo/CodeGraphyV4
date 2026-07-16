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
  setUpRefreshFacade,
} from './refreshFacadeFixture';

describe('pipeline/service/refreshFacade gitignore', () => {
  beforeEach(setUpRefreshFacade);

  it('refreshes gitignore metadata by rebuilding from cached analysis without analyzing files', async () => {
    const facade = new TestRefreshFacade();
    const disabledPlugins = new Set(['plugin.disabled']);
    facade._lastFileAnalysis = new Map([
      ['example-python/src/main.py', { filePath: '/workspace/example-python/src/main.py', relations: [] }],
    ]) as never;
    vi.mocked(discoverWorkspacePipelineFilesWithWarnings).mockResolvedValueOnce({
      directories: ['example-python', 'example-python/src'],
      files: [
        {
          absolutePath: '/workspace/example-python/src/main.py',
          relativePath: 'example-python/src/main.py',
        },
      ],
      gitIgnoredPaths: ['example-python/src/main.py'],
    } as never);
    facade._buildGraphDataFromAnalysis = vi.fn(() => ({
      nodes: [{
        color: '#64748B',
        id: 'example-python/src/main.py',
        label: 'main.py',
        metadata: { gitIgnored: true },
      }],
      edges: [],
    })) as never;

    await expect(
      facade.refreshGitignoreMetadata(undefined, disabledPlugins),
    ).resolves.toEqual({
      nodes: [{
        color: '#64748B',
        id: 'example-python/src/main.py',
        label: 'main.py',
        metadata: { gitIgnored: true },
      }],
      edges: [],
    });

    expect(facade._analyzeFiles).not.toHaveBeenCalled();
    expect(facade._lastGitIgnoredPaths).toEqual(['example-python/src/main.py']);
    expect(discoverWorkspacePipelineFilesWithWarnings).toHaveBeenCalledWith(
      'discovery-deps',
      '/workspace',
      { showOrphans: true, respectGitignore: true },
      [],
      ['plugin-filter'],
      undefined,
      expect.any(Function),
    );
    expect(facade._buildGraphDataFromAnalysis).toHaveBeenCalledWith(
      facade._lastFileAnalysis,
      '/workspace',
      true,
      disabledPlugins,
    );
    expect(facade._persistIndexMetadata).toHaveBeenCalledOnce();
  });
});
