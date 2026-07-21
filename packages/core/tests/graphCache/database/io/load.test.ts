import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWorkspaceAnalysisDatabaseCache, loadWorkspaceAnalysisDatabaseCacheAsync } from '../../../../src/graphCache/database/io/load';
import {
  createEmptyWorkspaceAnalysisCache,
  WORKSPACE_ANALYSIS_CACHE_VERSION,
} from '../../../../src/analysis/cache';
import { readRowsAsync, readRowsSync, withConnection, withConnectionAsync } from '../../../../src/graphCache/database/io/connection';
import { clearDatabaseArtifacts, getWorkspaceAnalysisDatabasePath } from '../../../../src/graphCache/database/io/paths';
import { parseDatabaseRecords } from '../../../../src/graphCache/database/records/parser';

vi.mock('node:fs', () => ({
  default: { existsSync: vi.fn() },
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

vi.mock('../../../../src/graphCache/database/records/parser', () => ({
  parseDatabaseRecords: vi.fn(),
}));

const fsModule = await import('node:fs');
const hydrated = {
  files: [{
    filePath: 'src/app.ts',
    mtime: 1,
    size: 2,
    analysis: { filePath: '/workspace/src/app.ts', relations: [] },
  }],
  graph: { nodes: [], edges: [] },
  symbols: [],
  relations: [],
};

describe('graphCache/database/load', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceAnalysisDatabasePath).mockReturnValue('/workspace/.codegraphy/graph.sqlite');
    vi.mocked(createEmptyWorkspaceAnalysisCache).mockReturnValue({ version: '0.0.0', files: {} });
    vi.mocked(parseDatabaseRecords).mockReturnValue(hydrated as never);
  });

  it('returns an empty cache when the database file does not exist', () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(false);

    expect(loadWorkspaceAnalysisDatabaseCache('/workspace')).toEqual({ version: '0.0.0', files: {} });
    expect(withConnection).not.toHaveBeenCalled();
  });

  it('loads and hydrates all relational tables', () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    vi.mocked(withConnection).mockImplementation((_databasePath, callback) => callback('connection' as never));
    vi.mocked(readRowsSync)
      .mockReturnValueOnce(['file-row'] as never)
      .mockReturnValueOnce(['node-row'] as never)
      .mockReturnValueOnce(['symbol-row'] as never)
      .mockReturnValueOnce(['edge-row'] as never);

    expect(loadWorkspaceAnalysisDatabaseCache('/workspace')).toEqual({
      version: WORKSPACE_ANALYSIS_CACHE_VERSION,
      files: {
        'src/app.ts': {
          mtime: 1,
          size: 2,
          analysis: {
            cache: { tiers: ['baseline', 'symbols'] },
            filePath: '/workspace/src/app.ts',
            relations: [],
          },
        },
      },
    });
    expect(parseDatabaseRecords).toHaveBeenCalledWith(
      ['file-row'],
      ['node-row'],
      ['symbol-row'],
      ['edge-row'],
    );
  });

  it('clears broken database artifacts and falls back to an empty cache', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    vi.mocked(withConnection).mockImplementation(() => { throw new Error('sqlite error'); });

    expect(loadWorkspaceAnalysisDatabaseCache('/workspace')).toEqual({ version: '0.0.0', files: {} });
    expect(clearDatabaseArtifacts).toHaveBeenCalledWith('/workspace/.codegraphy/graph.sqlite');
    expect(warn).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to read persisted analysis database. Rebuilding cache.',
      expect.any(Error),
    );
  });

  it('loads all relational tables asynchronously', async () => {
    vi.mocked(fsModule.existsSync).mockReturnValue(true);
    vi.mocked(withConnectionAsync).mockImplementation(async (_path, callback) => callback('connection' as never));
    vi.mocked(readRowsAsync)
      .mockResolvedValueOnce(['file-row'] as never)
      .mockResolvedValueOnce(['node-row'] as never)
      .mockResolvedValueOnce(['symbol-row'] as never)
      .mockResolvedValueOnce(['edge-row'] as never);

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
