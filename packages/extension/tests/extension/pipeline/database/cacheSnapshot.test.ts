import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { readWorkspaceAnalysisDatabaseSnapshot } from '../../../../src/extension/pipeline/database/cache/snapshot';
import { readRowsSync, withConnection } from '../../../../src/extension/pipeline/database/cache/connection';
import { getWorkspaceAnalysisDatabasePath } from '../../../../src/extension/pipeline/database/cache/paths';
import {
  createSnapshotFileEntry,
  createSnapshotRelationEntry,
  createSnapshotSymbolEntry,
} from '../../../../src/extension/pipeline/database/cache/rows';
import {
  FILE_ANALYSIS_ROWS_QUERY,
  RELATION_ROWS_QUERY,
  SYMBOL_ROWS_QUERY,
} from '../../../../src/extension/pipeline/database/cache/queries';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('../../../../src/extension/pipeline/database/cache/connection', () => ({
  readRowsSync: vi.fn(),
  withConnection: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/database/cache/paths', () => ({
  getWorkspaceAnalysisDatabasePath: vi.fn(),
}));

vi.mock('../../../../src/extension/pipeline/database/cache/rows', () => ({
  createSnapshotFileEntry: vi.fn(),
  createSnapshotRelationEntry: vi.fn(),
  createSnapshotSymbolEntry: vi.fn(),
}));

describe('pipeline/database/cache/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspaceAnalysisDatabasePath).mockReturnValue('/workspace/.codegraphy/graph.lbug');
  });

  it('returns an empty snapshot when the repo-local database does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(readWorkspaceAnalysisDatabaseSnapshot('/workspace')).toEqual({
      files: [],
      symbols: [],
      relations: [],
    });
    expect(withConnection).not.toHaveBeenCalled();
  });

  it('reads rows through the database connection and drops invalid snapshot entries', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(withConnection).mockImplementation((_path, callback) => callback('connection' as never));
    vi.mocked(readRowsSync)
      .mockReturnValueOnce([{ id: 'file-1' }, { id: 'file-2' }] as never)
      .mockReturnValueOnce([{ id: 'symbol-1' }] as never)
      .mockReturnValueOnce([{ id: 'relation-1' }, { id: 'relation-2' }] as never);
    vi.mocked(createSnapshotFileEntry)
      .mockReturnValueOnce({ filePath: 'src/file.ts', mtime: 1, analysis: { filePath: 'src/file.ts', relations: [] } } as never)
      .mockReturnValueOnce(undefined);
    vi.mocked(createSnapshotSymbolEntry).mockReturnValueOnce({ id: 'symbol-1', filePath: 'src/file.ts', name: 'render', kind: 'function' } as never);
    vi.mocked(createSnapshotRelationEntry)
      .mockReturnValueOnce({ kind: 'import', sourceId: 'source', fromFilePath: 'src/file.ts' } as never)
      .mockReturnValueOnce(undefined);

    expect(readWorkspaceAnalysisDatabaseSnapshot('/workspace')).toEqual({
      files: [{ filePath: 'src/file.ts', mtime: 1, analysis: { filePath: 'src/file.ts', relations: [] } }],
      symbols: [{ id: 'symbol-1', filePath: 'src/file.ts', name: 'render', kind: 'function' }],
      relations: [{ kind: 'import', sourceId: 'source', fromFilePath: 'src/file.ts' }],
    });

    expect(readRowsSync).toHaveBeenNthCalledWith(1, 'connection', FILE_ANALYSIS_ROWS_QUERY);
    expect(readRowsSync).toHaveBeenNthCalledWith(2, 'connection', SYMBOL_ROWS_QUERY);
    expect(readRowsSync).toHaveBeenNthCalledWith(3, 'connection', RELATION_ROWS_QUERY);
  });

  it('warns and falls back to an empty snapshot when reading the database fails', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = new Error('corrupt database');
    vi.mocked(withConnection).mockImplementation(() => {
      throw error;
    });

    expect(readWorkspaceAnalysisDatabaseSnapshot('/workspace')).toEqual({
      files: [],
      symbols: [],
      relations: [],
    });
    expect(warning).toHaveBeenCalledWith(
      '[CodeGraphy] Failed to read structured analysis snapshot.',
      error,
    );
  });
});
