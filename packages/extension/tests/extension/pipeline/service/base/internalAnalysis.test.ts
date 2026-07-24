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
  createWorkspacePipelinePluginBuildSignature: vi.fn(),
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
  analyzeWorkspacePipelineDiscoveredFiles,
  preAnalyzeWorkspacePipelinePlugins,
  createWorkspacePipelineAnalysisCacheTiers,
  setUpInternalBase,
} from './internalFixture';

describe('extension/pipeline/service/internalBase analysis', () => {
  beforeEach(setUpInternalBase);

  it('prunes only cache entries whose files are no longer present', () => {
    const source = new TestInternalBase();
    source._cache.files['src/deleted.ts'] = { cached: true } as never;

    source.pruneMissingCacheFiles(['src/a.ts', 'src/filtered.ts']);

    expect(Object.keys(source._cache.files)).toEqual(['src/a.ts']);
  });

  it('delegates pre-analysis through the shared helper with registry and discovery callbacks', async () => {
    const source = new TestInternalBase();
    const files = [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }];
    const disabledPlugins = new Set(['plugin.disabled']);
    source._registry = {
      ...source._registry,
      notifyPreAnalyze: vi.fn(async () => undefined),
    } as never;

    await source.preAnalyzePlugins(files, '/workspace', disabledPlugins);

    expect(preAnalyzeWorkspacePipelinePlugins).toHaveBeenCalledWith(
      files,
      '/workspace',
      expect.any(Object),
      undefined,
      disabledPlugins,
    );
    const dependencies = vi.mocked(preAnalyzeWorkspacePipelinePlugins).mock.calls[0][2];
    await dependencies.notifyPreAnalyze(
      [{ relativePath: 'src/a.ts' }] as never,
      '/workspace',
    );
    expect(source._registry.notifyPreAnalyze).toHaveBeenCalledWith(
      [{ relativePath: 'src/a.ts' }],
      '/workspace',
      undefined,
      disabledPlugins,
    );
    await expect(dependencies.readContent(files[0] as never)).resolves.toBe(
      'contents:/workspace/src/a.ts',
    );
    expect(source._discovery.readContent).toHaveBeenCalledWith(files[0]);
  });

  it('delegates file analysis through the shared helper with the current collaborators', async () => {
    const source = new TestInternalBase();
    const progress = vi.fn();
    const disabledPlugins = new Set(['plugin.disabled']);
    source.setEventBus({ emit: vi.fn() } as never);
    source._registry = {
      ...source._registry,
      list: vi.fn(() => [
        { plugin: { id: 'plugin.a' } },
        { plugin: { id: '' } },
        { plugin: { id: undefined } },
        { plugin: { id: 'plugin.disabled' } },
      ]),
    } as never;
    const state = source as unknown as { _eventBus: unknown };
    const getFileStat = vi
      .spyOn(source as unknown as { _getFileStat: (filePath: string) => Promise<{ mtime: number; size: number } | null> }, '_getFileStat')
      .mockResolvedValue({ mtime: 1, size: 2 });

    await source.analyzeFiles(
      [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }],
      '/workspace',
      progress,
      disabledPlugins,
    );

    expect(analyzeWorkspacePipelineDiscoveredFiles).toHaveBeenCalledWith(
      source._cache,
      source._discovery,
      state._eventBus,
      source._registry,
      expect.any(Function),
      [{ absolutePath: '/workspace/src/a.ts', relativePath: 'src/a.ts' }],
      '/workspace',
      progress,
      undefined,
      {
        active: ['baseline', 'plugin:plugin.a'],
        completed: ['baseline', 'plugin:plugin.a'],
        required: ['baseline', 'plugin:plugin.a'],
      },
      ['plugin.a'],
      disabledPlugins,
    );
    expect(createWorkspacePipelineAnalysisCacheTiers).toHaveBeenCalledWith(
      ['plugin.a'],
    );
    await expect(
      vi.mocked(analyzeWorkspacePipelineDiscoveredFiles).mock.calls[0][4]('/workspace/src/a.ts'),
    ).resolves.toEqual({ mtime: 1, size: 2 });
    expect(getFileStat).toHaveBeenCalledWith('/workspace/src/a.ts');
  });
});
