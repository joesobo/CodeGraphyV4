import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyWorkspaceAnalysisCache } from '../../../../../src/extension/pipeline/cache';
import {
  clearWorkspaceAnalysisDatabaseCacheQueued,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../../../../src/extension/pipeline/database/cache/storage.ts';
import {
  clearWorkspacePipelineStoredCache,
  persistWorkspacePipelineCache,
} from '../../../../../src/extension/pipeline/service/cache/storage';

vi.mock('../../../../../src/extension/pipeline/cache', () => ({
  createEmptyWorkspaceAnalysisCache: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  clearWorkspaceAnalysisDatabaseCacheQueued: vi.fn(async () => undefined),
  saveWorkspaceAnalysisDatabaseCacheAsync: vi.fn(async () => undefined),
}));

describe('pipeline/service/cache/storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an empty cache immediately and queues repo-local clearing', () => {
    const cache = { files: {} };
    vi.mocked(createEmptyWorkspaceAnalysisCache).mockReturnValue(cache as never);
    const logInfo = vi.fn();

    expect(clearWorkspacePipelineStoredCache('/workspace', logInfo)).toBe(cache);
    expect(clearWorkspaceAnalysisDatabaseCacheQueued).toHaveBeenCalledWith('/workspace');
    expect(logInfo).toHaveBeenCalledWith('[CodeGraphy] Cache cleared');
  });

  it('skips cache persistence when no workspace root is available', () => {
    const warn = vi.fn();

    persistWorkspacePipelineCache(undefined, { files: {} } as never, warn);

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('persists the repo-local cache when a workspace root is available', () => {
    const cache = { files: { 'src/a.ts': {} } };
    const warn = vi.fn();

    persistWorkspacePipelineCache('/workspace', cache as never, warn);

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledWith('/workspace', cache);
    expect(warn).not.toHaveBeenCalled();
  });

  it('returns before repo-local cache persistence settles', async () => {
    const cache = { files: { 'src/a.ts': {} } };
    const warn = vi.fn();
    let resolveSave!: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    vi.mocked(saveWorkspaceAnalysisDatabaseCacheAsync).mockReturnValue(savePromise);

    persistWorkspacePipelineCache('/workspace', cache as never, warn);

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledWith('/workspace', cache);
    expect(warn).not.toHaveBeenCalled();

    resolveSave();
    await savePromise;
  });

  it('warns when saving the repo-local cache rejects', async () => {
    const cache = { files: {} };
    const warn = vi.fn();
    const error = new Error('save failed');
    vi.mocked(saveWorkspaceAnalysisDatabaseCacheAsync).mockRejectedValue(error);

    persistWorkspacePipelineCache('/workspace', cache as never, warn);

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        '[CodeGraphy] Failed to persist repo-local analysis cache.',
        error,
      );
    });
  });
});
