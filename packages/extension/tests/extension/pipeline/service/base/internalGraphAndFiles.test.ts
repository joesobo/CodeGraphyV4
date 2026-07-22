import { describe, expect, it, vi, beforeEach } from 'vitest';
vi.mock('../../../../../src/extension/pipeline/serviceAdapters', () => ({
  readWorkspacePipelineFileStat: vi.fn(),
  readWorkspacePipelineRoot: vi.fn(() => '/workspace'),
}));

vi.mock('../../../../../src/extension/pipeline/service/runtime/analysis', () => ({
  analyzeWorkspacePipelineDiscoveredFiles: vi.fn(),
  preAnalyzeWorkspacePipelinePlugins: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/storage', () => ({
  persistWorkspacePipelineCache: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/runtime/graph', () => ({
  buildWorkspacePipelineCompleteGraphDataFromAnalysis: vi.fn(),
  buildWorkspacePipelineGraph: vi.fn(),
  buildWorkspacePipelineGraphFromAnalysis: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/index', () => ({
  persistWorkspacePipelineIndexMetadata: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/paths', () => ({
  readWorkspacePipelineAnalysisFiles: vi.fn(),
  toWorkspaceRelativePath: vi.fn((workspaceRoot: string, filePath: string) =>
    filePath.replace(`${workspaceRoot}/`, ''),
  ),
}));

vi.mock('../../../../../src/extension/pipeline/cacheSignatures/commit', () => ({
  readWorkspacePipelineCurrentCommitSha: vi.fn(),
  readWorkspacePipelineCurrentCommitShaSync: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/cacheSignatures/plugin', () => ({
  createWorkspacePipelinePluginSignature: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/cacheSignatures/settings', () => ({
  createWorkspacePipelineSettingsSignature: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/service/cache/tiers', () => ({
  createWorkspacePipelineAnalysisCacheTiers: vi.fn(),
}));

vi.mock('@codegraphy-dev/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@codegraphy-dev/core')>()),
  preAnalyzeCoreTreeSitterFiles: vi.fn(),
}));

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    fs: {},
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      update: vi.fn(),
      inspect: vi.fn(),
    })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
}));

import {
  TestInternalBase,
  vscode,
  readWorkspacePipelineFileStat,
  buildWorkspacePipelineCompleteGraphDataFromAnalysis,
  buildWorkspacePipelineGraph,
  buildWorkspacePipelineGraphFromAnalysis,
  readWorkspacePipelineAnalysisFiles,
  toWorkspaceRelativePath,
  setUpInternalBase,
} from './internalFixture';

describe('extension/pipeline/service/internalBase graph and files', () => {
  beforeEach(setUpInternalBase);

  it('delegates graph building helpers with cache and registry state', () => {
    const source = new TestInternalBase();
    const fileConnections = new Map([['src/a.ts', [{ from: 'a', to: 'b' }]]]);
    const fileAnalysis = new Map([['src/a.ts', { filePath: 'src/a.ts' }]]);
    const disabledPlugins = new Set(['plugin.disabled']);
    const discoveredDirectories = ['src/generated'];
    const gitIgnoredPaths = ['src/generated/cache.py'];
    source.setLastDiscoveredDirectories(discoveredDirectories);
    source.setLastGitIgnoredPaths(gitIgnoredPaths);
    vi.mocked(buildWorkspacePipelineCompleteGraphDataFromAnalysis)
      .mockReturnValue({ nodes: [{ id: 'complete-analysis-graph' }], edges: [] } as never);
    vi.mocked(buildWorkspacePipelineGraphFromAnalysis)
      .mockReturnValue({ nodes: [{ id: 'analysis-graph' }], edges: [] } as never);

    expect(
      source.buildGraphData(fileConnections, '/workspace', true, disabledPlugins),
    ).toEqual({
      nodes: [{ id: 'graph' }],
      edges: [],
    });
    expect(buildWorkspacePipelineGraph).toHaveBeenCalledWith(
      source._cache,
      source._registry,
      fileConnections,
      '/workspace',
      true,
      disabledPlugins,
      discoveredDirectories,
      gitIgnoredPaths,
    );

    expect(
      source.buildGraphDataFromAnalysis(
        fileAnalysis,
        '/workspace',
        false,
        disabledPlugins,
      ),
    ).toEqual({
      nodes: [{ id: 'analysis-graph' }],
      edges: [],
    });
    expect(source.completeGraphData).toEqual({
      nodes: [{ id: 'complete-analysis-graph' }],
      edges: [],
    });
    expect(buildWorkspacePipelineCompleteGraphDataFromAnalysis).toHaveBeenCalledWith(
      source._cache,
      source._registry,
      fileAnalysis,
      '/workspace',
      false,
      disabledPlugins,
      discoveredDirectories,
      gitIgnoredPaths,
    );
    expect(buildWorkspacePipelineGraphFromAnalysis).toHaveBeenCalledWith(
      source._cache,
      source._registry,
      fileAnalysis,
      '/workspace',
      false,
      disabledPlugins,
      discoveredDirectories,
      { nodeVisibility: { file: true, symbol: false } },
      gitIgnoredPaths,
    );
  });

  it('delegates file stats and workspace-relative paths through the shared helpers', async () => {
    const source = new TestInternalBase();

    await expect(source.getFileStat('/workspace/src/a.ts')).resolves.toEqual({
      mtime: 123,
      size: 456,
    });
    expect(readWorkspacePipelineFileStat).toHaveBeenCalledWith(
      '/workspace/src/a.ts',
      vscode.workspace.fs,
    );

    expect(
      source.toWorkspaceRelativePath('/workspace', '/workspace/src/a.ts'),
    ).toBe('src/a.ts');
    expect(toWorkspaceRelativePath).toHaveBeenCalledWith(
      '/workspace',
      '/workspace/src/a.ts',
    );
  });

  it('reads analysis files through the shared helper and discovery reader', async () => {
    const source = new TestInternalBase();
    const files = [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }];

    await expect(source.readAnalysisFiles(files)).resolves.toEqual([
      {
        absolutePath: '/workspace/src/a.ts',
        relativePath: 'src/a.ts',
        content: 'contents:/workspace/src/a.ts',
      },
    ]);

    expect(readWorkspacePipelineAnalysisFiles).toHaveBeenCalledWith(
      files,
      expect.any(Function),
    );
    const readContent = vi.mocked(readWorkspacePipelineAnalysisFiles).mock.calls[0][1];
    await expect(readContent(files[0] as never)).resolves.toBe(
      'contents:/workspace/src/a.ts',
    );
    expect(source._discovery.readContent).toHaveBeenCalledWith(files[0]);
  });
});
