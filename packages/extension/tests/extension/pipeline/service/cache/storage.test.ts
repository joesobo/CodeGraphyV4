import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearWorkspacePipelineCache } from '../../../../../src/extension/pipeline/analysis/state';
import {
  patchWorkspaceAnalysisDatabaseCacheAsync,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../../../../src/extension/pipeline/database/cache/storage.ts';
import {
  clearWorkspacePipelineStoredCache,
  hasPendingWorkspacePipelineCacheSave,
  patchWorkspacePipelineCache,
  persistWorkspacePipelineCache,
} from '../../../../../src/extension/pipeline/service/cache/storage';

vi.mock('../../../../../src/extension/pipeline/analysis/state', () => ({
  clearWorkspacePipelineCache: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  patchWorkspaceAnalysisDatabaseCacheAsync: vi.fn(async () => undefined),
  saveWorkspaceAnalysisDatabaseCacheAsync: vi.fn(async () => undefined),
}));

describe('pipeline/service/cache/storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delegates cache clearing to the shared workspace cache helper', () => {
    const cache = { files: {} };
    vi.mocked(clearWorkspacePipelineCache).mockReturnValue(cache as never);
    const logInfo = vi.fn();

    expect(clearWorkspacePipelineStoredCache('/workspace', logInfo)).toBe(cache);
    expect(clearWorkspacePipelineCache).toHaveBeenCalledWith('/workspace', logInfo);
  });

  it('skips cache persistence when no workspace root is available', () => {
    const warn = vi.fn();

    persistWorkspacePipelineCache(undefined, { files: {} } as never, warn);

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('persists the repo-local cache when a workspace root is available', async () => {
    const cache = { files: { 'src/a.ts': {} } };
    const warn = vi.fn();

    persistWorkspacePipelineCache('/workspace', cache as never, warn);

    expect(hasPendingWorkspacePipelineCacheSave('/workspace')).toBe(true);
    expect(saveWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(hasPendingWorkspacePipelineCacheSave('/workspace')).toBe(false);
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

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();
    expect(saveWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledWith('/workspace', cache);
    resolveSave();
    await savePromise;
  });

  it('warns when saving the repo-local cache rejects', async () => {
    const cache = { files: {} };
    const warn = vi.fn();
    const error = new Error('save failed');
    vi.mocked(saveWorkspaceAnalysisDatabaseCacheAsync).mockRejectedValue(error);

    persistWorkspacePipelineCache('/workspace', cache as never, warn);

    await vi.runAllTimersAsync();
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        '[CodeGraphy] Failed to persist repo-local analysis cache.',
        error,
      );
    });
  });

  it('defers changed-file patches and writes only the selected cache entries', async () => {
    const warn = vi.fn();
    const cache = {
      files: {
        'src/changed.ts': { mtime: 2, analysis: {} },
        'src/untouched.ts': { mtime: 1, analysis: {} },
      },
    };

    patchWorkspacePipelineCache('/workspace', cache as never, {
      deleteFilePaths: ['src/deleted.ts'],
      upsertFilePaths: ['src/changed.ts'],
    }, warn);

    expect(patchWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(patchWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledWith('/workspace', {
      deleteFilePaths: ['src/deleted.ts'],
      upsertFiles: { 'src/changed.ts': { mtime: 2, analysis: {} } },
    });
    expect(warn).not.toHaveBeenCalled();
  });
});
