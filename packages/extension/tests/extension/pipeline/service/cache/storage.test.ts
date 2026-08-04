import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createEmptyWorkspaceAnalysisCache } from '../../../../../src/extension/pipeline/cache';
import {
  clearWorkspaceAnalysisDatabaseCacheQueued,
  patchWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCacheAsync,
} from '../../../../../src/extension/pipeline/database/cache/storage.ts';
import {
  clearWorkspacePipelineStoredCache,
  patchWorkspacePipelineCache,
  persistWorkspacePipelineCache,
} from '../../../../../src/extension/pipeline/service/cache/storage';

vi.mock('../../../../../src/extension/pipeline/cache', () => ({
  createEmptyWorkspaceAnalysisCache: vi.fn(),
}));

vi.mock('../../../../../src/extension/pipeline/database/cache/storage.ts', () => ({
  clearWorkspaceAnalysisDatabaseCacheQueued: vi.fn(async () => undefined),
  patchWorkspaceAnalysisDatabaseCache: vi.fn(async () => undefined),
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

    persistWorkspacePipelineCache(
      undefined,
      { files: {} } as never,
      { nodes: [], edges: [] },
      warn,
    );

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it('persists the repo-local cache when a workspace root is available', () => {
    const cache = { files: { 'src/a.ts': {} } };
    const graph = { nodes: [{ id: 'src/a.ts' }], edges: [] };
    const warn = vi.fn();

    persistWorkspacePipelineCache('/workspace', cache as never, graph as never, warn);

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledWith('/workspace', cache, { graph });
    expect(warn).not.toHaveBeenCalled();
  });

  it('waits for targeted Graph Cache patches and persists Core-selected complete graph data', async () => {
    const cache = { files: { 'src/a.ts': { size: 1 } } };
    const graph = { nodes: [{ id: 'src/a.ts' }], edges: [] };
    const completeGraph = { nodes: [{ id: 'src/a.ts' }, { id: 'hidden' }], edges: [] };
    let finishPatch: (() => void) | undefined;
    vi.mocked(patchWorkspaceAnalysisDatabaseCache).mockReturnValue(
      new Promise<void>(resolve => {
        finishPatch = resolve;
      }),
    );

    const persistence = patchWorkspacePipelineCache('/workspace', cache as never, {
      completeGraph: completeGraph as never,
      deleteFilePaths: [],
      upsertFilePaths: ['src/a.ts'],
      graph: graph as never,
    }, vi.fn());
    let settled = false;
    void persistence.then(() => {
      settled = true;
    });
    await Promise.resolve();

    expect(settled).toBe(false);
    expect(patchWorkspaceAnalysisDatabaseCache).toHaveBeenCalledWith('/workspace', {
      deleteFilePaths: [],
      upsertFiles: { 'src/a.ts': { size: 1 } },
      graph: completeGraph,
    });
    finishPatch?.();
    await persistence;
    expect(settled).toBe(true);
  });

  it('reports targeted Graph Cache patch failures to the update owner', async () => {
    const error = new Error('patch failed');
    const warn = vi.fn();
    vi.mocked(patchWorkspaceAnalysisDatabaseCache).mockRejectedValue(error);

    await expect(patchWorkspacePipelineCache('/workspace', { files: {} } as never, {
      deleteFilePaths: [],
      upsertFilePaths: [],
      graph: { nodes: [], edges: [] },
    }, warn)).rejects.toBe(error);

    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to patch repo-local analysis cache.',
      error,
    );
  });

  it('returns before repo-local cache persistence settles', async () => {
    const cache = { files: { 'src/a.ts': {} } };
    const graph = { nodes: [], edges: [] };
    const warn = vi.fn();
    let resolveSave!: () => void;
    const savePromise = new Promise<void>((resolve) => {
      resolveSave = resolve;
    });
    vi.mocked(saveWorkspaceAnalysisDatabaseCacheAsync).mockReturnValue(savePromise);

    persistWorkspacePipelineCache('/workspace', cache as never, graph, warn);

    expect(saveWorkspaceAnalysisDatabaseCacheAsync).toHaveBeenCalledWith('/workspace', cache, { graph });
    expect(warn).not.toHaveBeenCalled();

    resolveSave();
    await savePromise;
  });

  it('warns when saving the repo-local cache rejects', async () => {
    const cache = { files: {} };
    const graph = { nodes: [], edges: [] };
    const warn = vi.fn();
    const error = new Error('save failed');
    vi.mocked(saveWorkspaceAnalysisDatabaseCacheAsync).mockRejectedValue(error);

    persistWorkspacePipelineCache('/workspace', cache as never, graph, warn);

    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledWith(
        '[CodeGraphy] Failed to persist repo-local analysis cache.',
        error,
      );
    });
  });
});
