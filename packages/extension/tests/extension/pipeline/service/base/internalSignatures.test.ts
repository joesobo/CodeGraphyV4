import { describe, expect, it, beforeEach } from 'vitest';
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
  createWorkspacePipelinePluginSignature,
  readWorkspacePipelineCurrentCommitSha,
  createWorkspacePipelineSettingsSignature,
  readWorkspacePipelineCurrentCommitShaSync,
  setUpInternalBase,
} from './internalFixture';

describe('extension/pipeline/service/internalBase signatures', () => {
  beforeEach(setUpInternalBase);

  it('builds plugin and settings signatures through the shared helpers', () => {
    const source = new TestInternalBase();

    expect(source.getPluginSignature()).toBe('plugin-signature');
    expect(createWorkspacePipelinePluginSignature).toHaveBeenCalledWith(
      source._registry.list(),
      { settings: source._config.getAll() },
    );

    expect(source.getSettingsSignature()).toBe('settings-signature');
    expect(createWorkspacePipelineSettingsSignature).toHaveBeenCalledWith(
      source._config,
      source._registry.list(),
    );
  });

  it('reads the current commit sha synchronously through the signature helper', () => {
    const source = new TestInternalBase();

    expect(source.getCurrentCommitShaSync('/workspace')).toBe('commit-sha');
    expect(readWorkspacePipelineCurrentCommitShaSync).toHaveBeenCalledWith(
      '/workspace',
    );
  });

  it('reads the current commit sha asynchronously through the signature helper', async () => {
    const source = new TestInternalBase();

    await expect(source.getCurrentCommitSha('/workspace')).resolves.toBe(
      'async-commit-sha',
    );
    expect(readWorkspacePipelineCurrentCommitSha).toHaveBeenCalledWith(
      '/workspace',
    );
  });
});
