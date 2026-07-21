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
  buildWorkspacePipelineCompleteGraphDataFromAnalysis,
  buildWorkspacePipelineGraphFromAnalysis,
  persistWorkspacePipelineCache,
  persistWorkspacePipelineIndexMetadata,
  readWorkspacePipelineCurrentCommitShaSync,
  setUpInternalBase,
} from './internalFixture';

describe('extension/pipeline/service/internalBase persistence', () => {
  beforeEach(setUpInternalBase);

  it('persists index metadata through delegated getters and warning logging', async () => {
    const source = new TestInternalBase();
    const getPluginSignature = vi
      .spyOn(source as unknown as { _getPluginSignature: () => string | null }, '_getPluginSignature')
      .mockReturnValue('plugin-signature');
    const getSettingsSignature = vi
      .spyOn(source as unknown as { _getSettingsSignature: () => string }, '_getSettingsSignature')
      .mockReturnValue('settings-signature');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await source.persistIndexMetadata();

    expect(persistWorkspacePipelineIndexMetadata).toHaveBeenCalledWith(
      '/workspace',
      expect.any(Object),
    );
    const dependencies = vi.mocked(persistWorkspacePipelineIndexMetadata).mock.calls[0][1];
    expect(dependencies.getPluginSignature()).toBe('plugin-signature');
    expect(getPluginSignature).toHaveBeenCalledOnce();
    expect(dependencies.getSettingsSignature()).toBe('settings-signature');
    expect(getSettingsSignature).toHaveBeenCalledOnce();
    expect(dependencies.getCurrentCommitSha).toBeDefined();
    expect(dependencies.getCurrentCommitSha?.()).toBe('commit-sha');
    expect(readWorkspacePipelineCurrentCommitShaSync).toHaveBeenCalledWith('/workspace');
    dependencies.warn('failed to persist', new Error('boom'));
    expect(warnSpy).toHaveBeenCalledWith('failed to persist', expect.any(Error));
  });

  it('persists the cache through the shared helper and warning logger', () => {
    const source = new TestInternalBase();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const completeGraphData = { nodes: [{ id: 'complete' }], edges: [] };
    const scopedGraphData = { nodes: [{ id: 'scoped' }], edges: [] };
    vi.mocked(buildWorkspacePipelineCompleteGraphDataFromAnalysis)
      .mockReturnValue(completeGraphData as never);
    vi.mocked(buildWorkspacePipelineGraphFromAnalysis)
      .mockReturnValue(scopedGraphData as never);
    const graphData = source.buildGraphDataFromAnalysis(new Map(), '/workspace', true);

    expect(graphData).toBe(scopedGraphData);

    source.persistCache();

    expect(persistWorkspacePipelineCache).toHaveBeenCalledWith(
      '/workspace',
      source._cache,
      completeGraphData,
      expect.any(Function),
    );
    const warn = vi.mocked(persistWorkspacePipelineCache).mock.calls[0][3];
    warn('cache warning', new Error('boom'));
    expect(warnSpy).toHaveBeenCalledWith('cache warning', expect.any(Error));
  });
});
