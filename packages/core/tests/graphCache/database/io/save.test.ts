import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import {
  clearWorkspaceAnalysisDatabaseCache,
  patchWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../../src/graphCache/database/io/save';
import { saveWorkspaceAnalysisDatabaseCacheAsync } from '../../../../src/graphCache/database/io/saveAsync';
import * as connectionModule from '../../../../src/graphCache/database/io/connection';
import * as pathsModule from '../../../../src/graphCache/database/io/paths';
import * as writeModule from '../../../../src/graphCache/database/query/write';

const timerPromisesMock = vi.hoisted(() => ({
  setImmediate: vi.fn(async () => undefined),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('node:timers/promises', () => ({
  ...timerPromisesMock,
  default: timerPromisesMock,
}));

vi.mock('../../../../src/graphCache/database/io/connection', () => ({
  recreateInvalidDatabase: vi.fn(() => false),
  runStatementAsync: vi.fn(async () => undefined),
  runStatementSync: vi.fn(),
  withConnection: vi.fn(),
  withConnectionAsync: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/io/paths', () => ({
  ensureDatabaseDirectory: vi.fn(),
  getWorkspaceAnalysisDatabasePath: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/query/write', () => ({
  createWorkspaceAnalysisCachePatchWriter: vi.fn(),
  createWorkspaceAnalysisCacheWriter: vi.fn(),
  createWorkspaceAnalysisCacheWriterAsync: vi.fn(),
  deleteAnalysisEntry: vi.fn(),
  persistAnalysisEntry: vi.fn(),
  persistAnalysisEntryAsync: vi.fn(),
  sortedCacheEntries: vi.fn(),
}));

const cache = {
  version: '1',
  files: {
    'src/b.ts': { mtime: 2, size: 20, analysis: {} },
    'src/a.ts': { mtime: 1, size: 10, analysis: {} },
  },
} as never;

describe('graphCache/database/io/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(pathsModule.getWorkspaceAnalysisDatabasePath)
      .mockReturnValue('/workspace/.codegraphy/graph.sqlite');
    vi.mocked(writeModule.sortedCacheEntries).mockImplementation(cacheInput =>
      Object.entries(cacheInput.files)
        .sort(([left], [right]) => left.localeCompare(right)) as never,
    );
    vi.mocked(writeModule.createWorkspaceAnalysisCacheWriter)
      .mockReturnValue({ connection: 'connection', fileAnalysisStatement: 'statement' } as never);
    vi.mocked(writeModule.createWorkspaceAnalysisCachePatchWriter)
      .mockReturnValue({
        connection: 'connection',
        deleteFileAnalysisStatement: 'delete-file-statement',
        deleteRelationStatement: 'delete-relation-statement',
        deleteSymbolStatement: 'delete-symbol-statement',
        fileAnalysisStatement: 'statement',
      } as never);
    vi.mocked(writeModule.createWorkspaceAnalysisCacheWriterAsync)
      .mockResolvedValue({ connection: 'connection', fileAnalysisStatement: 'statement' } as never);
    vi.mocked(connectionModule.withConnection).mockImplementation((_databasePath, callback) =>
      callback('connection' as never));
    vi.mocked(connectionModule.withConnectionAsync).mockImplementation(async (_databasePath, callback) =>
      callback('connection' as never));
    vi.mocked(writeModule.persistAnalysisEntryAsync).mockImplementation(async (
      _writer,
      _filePath,
      _entry,
      afterStatement,
    ) => {
      await afterStatement();
    });
  });

  it('replaces the cache in one direct transaction and persists sorted entries', () => {
    saveWorkspaceAnalysisDatabaseCache('/workspace', cache);

    expect(pathsModule.ensureDatabaseDirectory).toHaveBeenCalledWith('/workspace');
    expect(connectionModule.withConnection).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.sqlite',
      expect.any(Function),
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      1,
      'connection',
      'BEGIN TRANSACTION',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      2,
      'connection',
      'DELETE FROM File',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      3,
      'connection',
      'DELETE FROM Symbol',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      4,
      'connection',
      'DELETE FROM Node',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      5,
      'connection',
      'DELETE FROM NodeType',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(6, 'connection', 'DELETE FROM EdgeType');
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(7, 'connection', 'DELETE FROM Relation');
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      8,
      'connection',
      'COMMIT',
    );
    expect(writeModule.persistAnalysisEntry).toHaveBeenNthCalledWith(
      1,
      { connection: 'connection', fileAnalysisStatement: 'statement' },
      'src/a.ts',
      { mtime: 1, size: 10, analysis: {} },
    );
    expect(writeModule.persistAnalysisEntry).toHaveBeenNthCalledWith(
      2,
      { connection: 'connection', fileAnalysisStatement: 'statement' },
      'src/b.ts',
      { mtime: 2, size: 20, analysis: {} },
    );
  });

  it('does not write when the database directory cannot be created', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    saveWorkspaceAnalysisDatabaseCache('/workspace', cache);

    expect(connectionModule.withConnection).not.toHaveBeenCalled();
  });

  it('preserves direct transaction failures', () => {
    vi.mocked(connectionModule.withConnection).mockImplementationOnce(() => {
      throw new Error('write failed');
    });

    expect(() => saveWorkspaceAnalysisDatabaseCache('/workspace', cache)).toThrow('write failed');
  });

  it('recreates a database that becomes corrupt during a full transaction', () => {
    const corruption = Object.assign(new Error('database disk image is malformed'), {
      code: 'SQLITE_CORRUPT',
    });
    vi.mocked(writeModule.persistAnalysisEntry).mockImplementationOnce(() => {
      throw corruption;
    });
    vi.mocked(connectionModule.recreateInvalidDatabase).mockReturnValueOnce(true);

    expect(() => saveWorkspaceAnalysisDatabaseCache('/workspace', cache)).not.toThrow();

    expect(connectionModule.recreateInvalidDatabase).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.sqlite',
      corruption,
    );
    expect(connectionModule.withConnection).toHaveBeenCalledTimes(2);
  });

  it('clears existing database rows from every cache table', () => {
    clearWorkspaceAnalysisDatabaseCache('/workspace');

    expect(connectionModule.withConnection).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.sqlite',
      expect.any(Function),
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      1,
      'connection',
      'DELETE FROM File',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      2,
      'connection',
      'DELETE FROM Symbol',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      3,
      'connection',
      'DELETE FROM Node',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(4, 'connection', 'DELETE FROM NodeType');
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(5, 'connection', 'DELETE FROM EdgeType');
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(6, 'connection', 'DELETE FROM Relation');
  });

  it('patches changed rows inside a transaction and commits the complete patch', () => {
    patchWorkspaceAnalysisDatabaseCache('/workspace', {
      deleteFilePaths: ['src/deleted.ts'],
      upsertFiles: {
        'src/changed.ts': {
          mtime: 4,
          size: 40,
          analysis: { filePath: '/workspace/src/changed.ts' },
        },
      },
    });

    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      1,
      'connection',
      'BEGIN TRANSACTION',
    );
    expect(writeModule.deleteAnalysisEntry).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ connection: 'connection' }),
      'src/changed.ts',
    );
    expect(writeModule.deleteAnalysisEntry).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ connection: 'connection' }),
      'src/deleted.ts',
    );
    expect(writeModule.persistAnalysisEntry).toHaveBeenCalledWith(
      expect.objectContaining({ connection: 'connection' }),
      'src/changed.ts',
      {
        mtime: 4,
        size: 40,
        analysis: { filePath: '/workspace/src/changed.ts' },
      },
    );
    expect(connectionModule.runStatementSync).toHaveBeenLastCalledWith(
      'connection',
      'COMMIT',
    );
  });

  it('rolls back the patch transaction when any patch statement fails', () => {
    vi.mocked(writeModule.persistAnalysisEntry).mockImplementationOnce(() => {
      throw new Error('patch failed');
    });

    expect(() => patchWorkspaceAnalysisDatabaseCache('/workspace', {
      upsertFiles: {
        'src/changed.ts': {
          mtime: 4,
          size: 40,
          analysis: { filePath: '/workspace/src/changed.ts' },
        },
      },
    })).toThrow('patch failed');

    expect(connectionModule.runStatementSync).toHaveBeenCalledWith(
      'connection',
      'ROLLBACK',
    );
    expect(connectionModule.runStatementSync).not.toHaveBeenCalledWith(
      'connection',
      'COMMIT',
    );
  });

  it('does not clear a missing database', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    clearWorkspaceAnalysisDatabaseCache('/workspace');

    expect(connectionModule.withConnection).not.toHaveBeenCalled();
    expect(connectionModule.runStatementSync).not.toHaveBeenCalled();
  });

  it('writes the async cache with progress and cooperative yielding', async () => {
    const onProgress = vi.fn();

    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache, {
      onProgress,
      yieldEvery: 1,
    });

    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      1,
      'connection',
      'BEGIN TRANSACTION',
    );
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      2,
      'connection',
      'DELETE FROM File',
    );
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      3,
      'connection',
      'DELETE FROM Symbol',
    );
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      4,
      'connection',
      'DELETE FROM Node',
    );
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      5,
      'connection',
      'DELETE FROM NodeType',
    );
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(6, 'connection', 'DELETE FROM EdgeType');
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(7, 'connection', 'DELETE FROM Relation');
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      8,
      'connection',
      'COMMIT',
    );
    expect(writeModule.persistAnalysisEntryAsync).toHaveBeenCalledTimes(2);
    expect(waitForImmediate).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, { current: 0, total: 2 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { current: 1, total: 2 });
    expect(onProgress).toHaveBeenNthCalledWith(3, { current: 2, total: 2 });
    expect(connectionModule.withConnectionAsync).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.sqlite',
      expect.any(Function),
    );
  });

  it('does not write the async cache when the database directory cannot be created', async () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache);

    expect(connectionModule.withConnectionAsync).not.toHaveBeenCalled();
  });

  it('waits for the async yield interval before yielding', async () => {
    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache, {
      yieldEvery: 2,
    });

    expect(waitForImmediate).toHaveBeenCalledTimes(1);
  });

  it('does not require async progress callbacks or positive yield intervals', async () => {
    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache, {
      yieldEvery: 0,
    });

    expect(waitForImmediate).not.toHaveBeenCalled();
    expect(writeModule.persistAnalysisEntryAsync).toHaveBeenCalledTimes(2);
  });

  it('preserves async transaction failures', async () => {
    vi.mocked(connectionModule.withConnectionAsync).mockRejectedValueOnce(new Error('async write failed'));

    await expect(saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache))
      .rejects.toThrow('async write failed');
  });

  it('retries async transaction corruption without replaying progress', async () => {
    const corruption = Object.assign(new Error('database disk image is malformed'), {
      code: 'SQLITE_CORRUPT',
    });
    const onProgress = vi.fn();
    let persistCalls = 0;
    vi.mocked(writeModule.persistAnalysisEntryAsync).mockImplementation(async (
      _writer,
      _filePath,
      _entry,
      afterStatement,
    ) => {
      await afterStatement();
      persistCalls += 1;
      if (persistCalls === 2) {
        throw corruption;
      }
    });
    vi.mocked(connectionModule.recreateInvalidDatabase).mockReturnValueOnce(true);

    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache, {
      onProgress,
      yieldEvery: 1,
    });

    expect(connectionModule.withConnectionAsync).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls).toEqual([
      [{ current: 0, total: 2 }],
      [{ current: 1, total: 2 }],
      [{ current: 2, total: 2 }],
    ]);
  });
});
