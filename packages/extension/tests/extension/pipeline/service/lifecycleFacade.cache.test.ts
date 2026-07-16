import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/extension/pipeline/service/cache/storage', () => ({
  clearWorkspacePipelineStoredCache: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/service/cache/invalidation', () => ({
  invalidateWorkspacePipelineFiles: vi.fn(),
  resolveWorkspacePipelinePluginFilePaths: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/service/runtime/plugins', () => ({
  getWorkspacePipelinePluginName: vi.fn(),
  getWorkspacePipelineStatusList: vi.fn(),
}));
vi.mock('../../../../src/extension/pipeline/plugins/statusContext', () => ({
  readWorkspacePluginStatusContext: vi.fn(),
}));
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [{ uri: { fsPath: '/workspace' } }],
    getConfiguration: vi.fn(() => ({ get: vi.fn(), update: vi.fn(), inspect: vi.fn() })),
    createFileSystemWatcher: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    onDidChangeConfiguration: vi.fn(),
  },
}));

import {
  TestLifecycleFacade,
  clearWorkspacePipelineStoredCache,
  invalidateWorkspacePipelineFiles,
  lifecycleState,
  setUpLifecycleFacade,
} from './lifecycleFacadeFixture';

describe('pipeline/service/lifecycleFacade', () => {
  beforeEach(setUpLifecycleFacade);

  it('replaces the cache through the stored-cache helper and logs its messages', () => {
    const facade = new TestLifecycleFacade();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    facade.clearCache();

    expect(clearWorkspacePipelineStoredCache).toHaveBeenCalledWith(
      '/workspace',
      expect.any(Function),
    );
    const onMessage = vi.mocked(clearWorkspacePipelineStoredCache).mock.calls[0][1];
    onMessage('cache cleared');
    expect(logSpy).toHaveBeenCalledWith('cache cleared');
    expect(facade._cache).toEqual({ files: { 'src/a.ts': { cached: true } } });
  });

  it('short-circuits file invalidation when no workspace root exists or no files are provided', () => {
    const facade = new TestLifecycleFacade();
    facade.getWorkspaceRoot.mockReturnValue(undefined);

    expect(facade.invalidateWorkspaceFiles(['/workspace/src/a.ts'])).toEqual([]);
    expect(invalidateWorkspacePipelineFiles).not.toHaveBeenCalled();
  });

  it('returns an empty invalidation set when no file paths are provided even with a workspace root', () => {
    const facade = new TestLifecycleFacade();

    expect(facade.invalidateWorkspaceFiles([])).toEqual([]);
    expect(invalidateWorkspacePipelineFiles).not.toHaveBeenCalled();
  });

  it('invalidates workspace files and persists only when files were removed from the cache', () => {
    const facade = new TestLifecycleFacade();
    lifecycleState(facade)._lastDiscoveredDirectories = ['src', 'src/a.ts', 'src/a.ts/deep'];
    const toWorkspaceRelativePath = vi
      .spyOn(
        facade as unknown as {
          _toWorkspaceRelativePath: (workspaceRoot: string, filePath: string) => string | undefined;
        },
        '_toWorkspaceRelativePath',
      )
      .mockReturnValue('src/a.ts');

    expect(facade.invalidateWorkspaceFiles(['/workspace/src/a.ts'])).toEqual(['src/a.ts']);
    expect(invalidateWorkspacePipelineFiles).toHaveBeenCalledWith(
      {
        cache: facade._cache,
        lastFileAnalysis: facade._lastFileAnalysis,
        lastFileConnections: facade._lastFileConnections,
      },
      '/workspace',
      ['/workspace/src/a.ts'],
      expect.any(Function),
    );
    const relativePathResolver = vi.mocked(invalidateWorkspacePipelineFiles).mock.calls[0][3];
    expect(relativePathResolver('/workspace', '/workspace/src/a.ts')).toBe('src/a.ts');
    expect(toWorkspaceRelativePath).toHaveBeenCalledWith('/workspace', '/workspace/src/a.ts');
    expect(lifecycleState(facade)._lastDiscoveredDirectories).toEqual(['src']);
    expect(facade.persistCache).toHaveBeenCalledOnce();

    vi.mocked(invalidateWorkspacePipelineFiles).mockReturnValueOnce([]);
    expect(facade.invalidateWorkspaceFiles(['/workspace/src/b.ts'])).toEqual([]);
    expect(facade.persistCache).toHaveBeenCalledOnce();
  });

  it('invalidates workspace files without immediate cache persistence when requested by refresh', () => {
    const facade = new TestLifecycleFacade();

    expect(facade.invalidateWorkspaceFiles(['/workspace/src/a.ts'], { persist: false }))
      .toEqual(['src/a.ts']);

    expect(invalidateWorkspacePipelineFiles).toHaveBeenCalledOnce();
    expect(facade.persistCache).not.toHaveBeenCalled();
  });
});
