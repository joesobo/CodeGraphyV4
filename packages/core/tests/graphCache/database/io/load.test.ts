import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWorkspaceAnalysisDatabaseCache, loadWorkspaceAnalysisDatabaseCacheAsync } from '../../../../src/graphCache/database/io/load';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../../src/analysis/cache';
import { readRowsAsync, readRowsSync, withConnection, withConnectionAsync } from '../../../../src/graphCache/database/io/connection';
import { clearDatabaseArtifacts, getWorkspaceAnalysisDatabasePath } from '../../../../src/graphCache/database/io/paths';
import { createSnapshotFileEntry } from '../../../../src/graphCache/database/records/file';

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
  existsSync: vi.fn(),
}));

vi.mock('../../../../src/analysis/cache', () => ({
  createEmptyWorkspaceAnalysisCache: vi.fn(),
  WORKSPACE_ANALYSIS_CACHE_VERSION: '2.0.0',
}));

vi.mock('../../../../src/graphCache/database/io/connection', () => ({
  readRowsSync: vi.fn(),
  readRowsAsync: vi.fn(),
  withConnection: vi.fn(),
  withConnectionAsync: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/io/paths', () => ({
  clearDatabaseArtifacts: vi.fn(),
  getWorkspaceAnalysisDatabasePath: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/records/file', () => ({
  createSnapshotFileEntry: vi.fn(),
}));

const fsModule = await import('node:fs');

describe('graphCache/database/load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceAnalysisDatabasePath).mockReturnValue('/workspace/.codegraphy/graph.sqlite');
    vi.mocked(createEmptyWorkspaceAnalysisCache).mockImplementation(() => ({
      version: '0.0.0',
      files: {},
    }) as never);
  });

  it('returns an empty cache when the database file does not exist', () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(false);

    expect(loadWorkspaceAnalysisDatabaseCache('/workspace')).toEqual({
      version: '0.0.0',
      files: {},
    });
    expect(withConnection).not.toHaveBeenCalled();
  });

  it('loads readable rows, skips empty entries, and warns for unreadable rows', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    vi.mocked(withConnection).mockImplementation((_databasePath, callback) => callback('connection' as never));
    vi.mocked(readRowsSync).mockReturnValue(['good-row', 'empty-row', 'bad-row'] as never);
    vi.mocked(createSnapshotFileEntry)
      .mockReturnValueOnce({
        filePath: 'src/app.ts',
        mtime: 1,
        size: 2,
        analysis: { filePath: '/workspace/src/app.ts', relations: [] },
      } as never)
      .mockImplementationOnce(() => null as never)
      .mockImplementationOnce(() => {
        throw new Error('bad row');
      });

    expect(loadWorkspaceAnalysisDatabaseCache('/workspace')).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/app.ts': {
          mtime: 1,
          size: 2,
          analysis: { filePath: '/workspace/src/app.ts', relations: [] },
        },
      },
    });
    expect(createSnapshotFileEntry).toHaveBeenCalledTimes(3);
    expect(readRowsSync).toHaveBeenCalledWith('connection', expect.any(String));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[CodeGraphy] Skipping unreadable persisted analysis row.', expect.any(Error));
  });

  it('clears broken database artifacts and falls back to an empty cache when the database read fails', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    vi.mocked(withConnection).mockImplementation(() => {
      throw new Error('sqlite error');
    });

    expect(loadWorkspaceAnalysisDatabaseCache('/workspace')).toEqual({
      version: '0.0.0',
      files: {},
    });
    expect(clearDatabaseArtifacts).toHaveBeenCalledWith('/workspace/.codegraphy/graph.sqlite');
    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to read persisted analysis database. Rebuilding cache.',
      expect.any(Error),
    );
  });

  it('loads rows asynchronously and skips unreadable entries', async () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    vi.mocked(withConnectionAsync).mockImplementation(async (_path, callback) => callback('connection' as never));
    vi.mocked(readRowsAsync).mockResolvedValue(['good-row', 'bad-row'] as never);
    vi.mocked(createSnapshotFileEntry)
      .mockReturnValueOnce({
        filePath: 'src/app.ts', mtime: 1, size: 2,
        analysis: { filePath: '/workspace/src/app.ts', relations: [] },
      } as never)
      .mockImplementationOnce(() => { throw new Error('bad row'); });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await expect(loadWorkspaceAnalysisDatabaseCacheAsync('/workspace')).resolves.toMatchObject({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: { 'src/app.ts': { mtime: 1, size: 2 } },
    });
  });

  it('returns an empty cache when async persistence is absent or broken', async () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(false);
    await expect(loadWorkspaceAnalysisDatabaseCacheAsync('/workspace')).resolves.toEqual({ version: '0.0.0', files: {} });

    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    vi.mocked(withConnectionAsync).mockRejectedValue(new Error('database error'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await expect(loadWorkspaceAnalysisDatabaseCacheAsync('/workspace')).resolves.toEqual({ version: '0.0.0', files: {} });
    expect(clearDatabaseArtifacts).toHaveBeenCalledWith('/workspace/.codegraphy/graph.sqlite');
  });
});
