import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import { setImmediate as waitForImmediate } from 'node:timers/promises';
import {
  clearWorkspaceAnalysisDatabaseCache,
  saveWorkspaceAnalysisDatabaseCache,
} from '../../../../src/graphCache/database/io/save';
import { saveWorkspaceAnalysisDatabaseCacheAsync } from '../../../../src/graphCache/database/io/saveAsync';
import * as connectionModule from '../../../../src/graphCache/database/io/connection';
import * as pathsModule from '../../../../src/graphCache/database/io/paths';
import * as temporaryModule from '../../../../src/graphCache/database/io/temporary';
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
  runStatementAsync: vi.fn(async () => undefined),
  runStatementSync: vi.fn(),
  withConnection: vi.fn(),
  withConnectionAsync: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/io/paths', () => ({
  ensureDatabaseDirectory: vi.fn(),
  getWorkspaceAnalysisDatabasePath: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/io/temporary', () => ({
  cleanupTemporaryDatabase: vi.fn(),
  createTemporaryDatabasePath: vi.fn(),
  replaceDatabaseCache: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/query/write', () => ({
  createWorkspaceAnalysisCacheWriter: vi.fn(),
  createWorkspaceAnalysisCacheWriterAsync: vi.fn(),
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
      .mockReturnValue('/workspace/.codegraphy/graph.lbug');
    vi.mocked(temporaryModule.createTemporaryDatabasePath)
      .mockReturnValue('/workspace/.codegraphy/graph.lbug.tmp');
    vi.mocked(writeModule.sortedCacheEntries).mockReturnValue([
      ['src/a.ts', { mtime: 1, size: 10, analysis: {} }],
      ['src/b.ts', { mtime: 2, size: 20, analysis: {} }],
    ] as never);
    vi.mocked(writeModule.createWorkspaceAnalysisCacheWriter)
      .mockReturnValue({ connection: 'connection', fileAnalysisStatement: 'statement' } as never);
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

  it('writes a temporary database, replaces the cache, and persists sorted entries', () => {
    saveWorkspaceAnalysisDatabaseCache('/workspace', cache);

    expect(pathsModule.ensureDatabaseDirectory).toHaveBeenCalledWith('/workspace');
    expect(connectionModule.withConnection).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.lbug.tmp',
      expect.any(Function),
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      1,
      'connection',
      'MATCH (entry:FileAnalysis) DELETE entry',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      2,
      'connection',
      'MATCH (entry:Symbol) DELETE entry',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      3,
      'connection',
      'MATCH (entry:Relation) DELETE entry',
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
    expect(temporaryModule.replaceDatabaseCache).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.lbug.tmp',
      '/workspace/.codegraphy/graph.lbug',
    );
    expect(temporaryModule.cleanupTemporaryDatabase).not.toHaveBeenCalled();
  });

  it('does not write when the database directory cannot be created', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    saveWorkspaceAnalysisDatabaseCache('/workspace', cache);

    expect(connectionModule.withConnection).not.toHaveBeenCalled();
    expect(temporaryModule.createTemporaryDatabasePath).not.toHaveBeenCalled();
    expect(temporaryModule.replaceDatabaseCache).not.toHaveBeenCalled();
  });

  it('cleans up the temporary database when saving fails', () => {
    vi.mocked(connectionModule.withConnection).mockImplementationOnce(() => {
      throw new Error('write failed');
    });

    expect(() => saveWorkspaceAnalysisDatabaseCache('/workspace', cache)).toThrow('write failed');
    expect(temporaryModule.cleanupTemporaryDatabase).toHaveBeenCalledWith('/workspace/.codegraphy/graph.lbug.tmp');
    expect(temporaryModule.replaceDatabaseCache).not.toHaveBeenCalled();
  });

  it('clears existing database rows from every cache table', () => {
    clearWorkspaceAnalysisDatabaseCache('/workspace');

    expect(connectionModule.withConnection).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.lbug',
      expect.any(Function),
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      1,
      'connection',
      'MATCH (entry:FileAnalysis) DELETE entry',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      2,
      'connection',
      'MATCH (entry:Symbol) DELETE entry',
    );
    expect(connectionModule.runStatementSync).toHaveBeenNthCalledWith(
      3,
      'connection',
      'MATCH (entry:Relation) DELETE entry',
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
      'MATCH (entry:FileAnalysis) DELETE entry',
    );
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      2,
      'connection',
      'MATCH (entry:Symbol) DELETE entry',
    );
    expect(connectionModule.runStatementAsync).toHaveBeenNthCalledWith(
      3,
      'connection',
      'MATCH (entry:Relation) DELETE entry',
    );
    expect(writeModule.persistAnalysisEntryAsync).toHaveBeenCalledTimes(2);
    expect(waitForImmediate).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenNthCalledWith(1, { current: 0, total: 2 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { current: 1, total: 2 });
    expect(onProgress).toHaveBeenNthCalledWith(3, { current: 2, total: 2 });
    expect(temporaryModule.replaceDatabaseCache).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.lbug.tmp',
      '/workspace/.codegraphy/graph.lbug',
    );
  });

  it('does not write the async cache when the database directory cannot be created', async () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);

    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache);

    expect(connectionModule.withConnectionAsync).not.toHaveBeenCalled();
    expect(temporaryModule.createTemporaryDatabasePath).not.toHaveBeenCalled();
    expect(temporaryModule.replaceDatabaseCache).not.toHaveBeenCalled();
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

  it('cleans up the temporary database when async saving fails', async () => {
    vi.mocked(connectionModule.withConnectionAsync).mockRejectedValueOnce(new Error('async write failed'));

    await expect(saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache))
      .rejects.toThrow('async write failed');
    expect(temporaryModule.cleanupTemporaryDatabase).toHaveBeenCalledWith('/workspace/.codegraphy/graph.lbug.tmp');
    expect(temporaryModule.replaceDatabaseCache).not.toHaveBeenCalled();
  });
});
