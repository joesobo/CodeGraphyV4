import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWorkspaceAnalysisDatabaseCache } from '../../../../src/extension/pipeline/database/cacheLoad';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../../src/extension/pipeline/cache';
import { readRowsSync, withConnection } from '../../../../src/extension/pipeline/database/cacheConnection';
import { clearDatabaseArtifacts, getWorkspaceAnalysisDatabasePath } from '../../../../src/extension/pipeline/database/cachePaths';
import { createSnapshotFileEntry } from '../../../../src/extension/pipeline/database/cacheRows';

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
  },
  existsSync: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/cache', () => ({
  createEmptyWorkspaceAnalysisCache: vi.fn(),
  WORKSPACE_ANALYSIS_CACHE_VERSION: '2.0.0',
}));

vi.mock('../../../../src/extension/pipeline/database/cacheConnection', () => ({
  readRowsSync: vi.fn(),
  withConnection: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/database/cachePaths', () => ({
  clearDatabaseArtifacts: vi.fn(),
  getWorkspaceAnalysisDatabasePath: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/database/cacheRows', () => ({
  createSnapshotFileEntry: vi.fn(),
}));

const fsModule = await import('node:fs');

describe('extension/pipeline/database/cacheLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceAnalysisDatabasePath).mockReturnValue('/workspace/.codegraphy/graph.lbug');
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
    expect(clearDatabaseArtifacts).toHaveBeenCalledWith('/workspace/.codegraphy/graph.lbug');
    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to read persisted analysis database. Rebuilding cache.',
      expect.any(Error),
    );
  });
});
