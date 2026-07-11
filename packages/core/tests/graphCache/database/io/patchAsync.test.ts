import { beforeEach, describe, expect, it, vi } from 'vitest';
import { patchWorkspaceAnalysisDatabaseCacheAsync } from '../../../../src/graphCache/database/io/patchAsync';
import * as connectionModule from '../../../../src/graphCache/database/io/connection';
import * as pathsModule from '../../../../src/graphCache/database/io/paths';
import * as writeModule from '../../../../src/graphCache/database/query/write';

vi.mock('../../../../src/graphCache/database/io/connection', () => ({
  runStatementAsync: vi.fn(async () => undefined),
  withConnectionAsync: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/io/paths', () => ({
  ensureDatabaseDirectory: vi.fn(),
  getWorkspaceAnalysisDatabasePath: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/query/write', () => ({
  createWorkspaceAnalysisCachePatchWriterAsync: vi.fn(),
  deleteAnalysisEntryAsync: vi.fn(async () => undefined),
  persistAnalysisEntryAsync: vi.fn(async () => undefined),
  sortedCacheEntries: vi.fn(),
}));

describe('graphCache/database/io/patchAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(pathsModule.getWorkspaceAnalysisDatabasePath)
      .mockReturnValue('/workspace/.codegraphy/graph.lbug');
    vi.mocked(connectionModule.withConnectionAsync).mockImplementation(async (_path, callback) =>
      callback('connection' as never));
    vi.mocked(writeModule.createWorkspaceAnalysisCachePatchWriterAsync).mockResolvedValue({
      connection: 'connection',
    } as never);
    vi.mocked(writeModule.sortedCacheEntries).mockImplementation(cache =>
      Object.entries(cache.files).sort(([left], [right]) => left.localeCompare(right)) as never);
  });

  it('deletes and upserts the complete patch in one async transaction', async () => {
    const changedEntry = {
      mtime: 4,
      size: 40,
      analysis: { filePath: '/workspace/src/changed.ts' },
    };

    await patchWorkspaceAnalysisDatabaseCacheAsync('/workspace', {
      deleteFilePaths: ['src/deleted.ts'],
      upsertFiles: { 'src/changed.ts': changedEntry },
    });

    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      1,
      'connection',
      'BEGIN TRANSACTION',
    );
    expect(writeModule.deleteAnalysisEntryAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ connection: 'connection' }),
      'src/changed.ts',
    );
    expect(writeModule.deleteAnalysisEntryAsync).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ connection: 'connection' }),
      'src/deleted.ts',
    );
    expect(writeModule.persistAnalysisEntryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ connection: 'connection' }),
      'src/changed.ts',
      changedEntry,
      expect.any(Function),
    );
    expect(connectionModule.runStatementAsync).toHaveBeenLastCalledWith(
      'connection',
      'COMMIT',
    );
  });

  it('rolls back when an async patch write fails', async () => {
    vi.mocked(writeModule.persistAnalysisEntryAsync).mockRejectedValueOnce(new Error('write failed'));

    await expect(patchWorkspaceAnalysisDatabaseCacheAsync('/workspace', {
      upsertFiles: {
        'src/changed.ts': { mtime: 1, analysis: {} } as never,
      },
    })).rejects.toThrow('write failed');

    expect(connectionModule.runStatementAsync).toHaveBeenCalledWith('connection', 'ROLLBACK');
    expect(connectionModule.runStatementAsync).not.toHaveBeenCalledWith('connection', 'COMMIT');
  });
});
