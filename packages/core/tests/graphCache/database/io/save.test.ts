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
import * as loadModule from '../../../../src/graphCache/database/io/load';
import * as pathsModule from '../../../../src/graphCache/database/io/paths';
import * as writeModule from '../../../../src/graphCache/database/query/write';
import * as snapshotModule from '../../../../src/graphCache/database/snapshot';

const timerPromisesMock = vi.hoisted(() => ({
  setImmediate: vi.fn(async () => undefined),
}));

vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  existsSync: vi.fn(),
}));

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

vi.mock('../../../../src/graphCache/database/io/load', () => ({
  loadWorkspaceAnalysisDatabaseCache: vi.fn(),
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
  deleteAnalysisEntryNodes: vi.fn(),
  persistWorkspaceCache: vi.fn(),
  persistWorkspaceCachePatch: vi.fn(),
  persistWorkspaceCacheAsync: vi.fn(),
}));

vi.mock('../../../../src/graphCache/database/snapshot', () => ({
  readWorkspaceAnalysisDatabaseSnapshot: vi.fn(),
}));

const cache = {
  version: '1',
  files: {
    'src/b.ts': { mtime: 2, size: 20, analysis: { filePath: '/workspace/src/b.ts' } },
    'src/a.ts': { mtime: 1, size: 10, analysis: { filePath: '/workspace/src/a.ts' } },
  },
};
const writer = { connection: 'connection', fileStatement: 'file-statement' } as never;

describe('graphCache/database/io/save', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(pathsModule.getWorkspaceAnalysisDatabasePath)
      .mockReturnValue('/workspace/.codegraphy/graph.sqlite');
    vi.mocked(writeModule.createWorkspaceAnalysisCacheWriter).mockReturnValue(writer);
    vi.mocked(writeModule.createWorkspaceAnalysisCachePatchWriter).mockReturnValue(writer as never);
    vi.mocked(writeModule.createWorkspaceAnalysisCacheWriterAsync).mockResolvedValue(writer);
    vi.mocked(connectionModule.withConnection).mockImplementation((_databasePath, callback) =>
      callback('connection' as never));
    vi.mocked(connectionModule.withConnectionAsync).mockImplementation(async (_databasePath, callback) =>
      callback('connection' as never));
    vi.mocked(loadModule.loadWorkspaceAnalysisDatabaseCache).mockReturnValue({
      version: '1',
      files: {
        'src/deleted.ts': { mtime: 1, analysis: { filePath: '/workspace/src/deleted.ts' } },
        'src/stable.ts': { mtime: 2, analysis: { filePath: '/workspace/src/stable.ts' } },
      },
    });
    vi.mocked(snapshotModule.readWorkspaceAnalysisDatabaseSnapshot).mockReturnValue({
      files: [],
      graph: { nodes: [], edges: [] },
      symbols: [],
      relations: [],
    });
    vi.mocked(writeModule.persistWorkspaceCacheAsync).mockImplementation(async (
      _writer,
      input,
      _graph,
      afterStatement,
    ) => {
      for (let index = 0; index < Object.keys(input.files).length; index += 1) {
        await afterStatement();
      }
    });
  });

  it('replaces all normalized tables in one transaction', () => {
    saveWorkspaceAnalysisDatabaseCache('/workspace', cache);

    expect(vi.mocked(connectionModule.runStatementSync).mock.calls).toEqual([
      ['connection', 'BEGIN TRANSACTION'],
      ['connection', 'DELETE FROM Edge'],
      ['connection', 'DELETE FROM Symbol'],
      ['connection', 'DELETE FROM Node'],
      ['connection', 'DELETE FROM File'],
      ['connection', 'COMMIT'],
    ]);
    expect(writeModule.persistWorkspaceCache).toHaveBeenCalledWith(
      writer,
      cache,
      undefined,
    );
  });

  it('does not write when the database directory cannot be created', () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);
    saveWorkspaceAnalysisDatabaseCache('/workspace', cache);
    expect(connectionModule.withConnection).not.toHaveBeenCalled();
  });

  it('recreates a database that becomes corrupt during a full transaction', () => {
    const corruption = Object.assign(new Error('database disk image is malformed'), {
      code: 'SQLITE_CORRUPT',
    });
    vi.mocked(writeModule.persistWorkspaceCache)
      .mockImplementationOnce(() => { throw corruption; });
    vi.mocked(connectionModule.recreateInvalidDatabase).mockReturnValueOnce(true);

    expect(() => saveWorkspaceAnalysisDatabaseCache('/workspace', cache)).not.toThrow();
    expect(connectionModule.recreateInvalidDatabase).toHaveBeenCalledWith(
      '/workspace/.codegraphy/graph.sqlite',
      corruption,
    );
    expect(connectionModule.withConnection).toHaveBeenCalledTimes(2);
  });

  it('clears normalized rows without deleting the database', () => {
    clearWorkspaceAnalysisDatabaseCache('/workspace');
    expect(vi.mocked(connectionModule.runStatementSync).mock.calls).toEqual([
      ['connection', 'DELETE FROM Edge'],
      ['connection', 'DELETE FROM Symbol'],
      ['connection', 'DELETE FROM Node'],
      ['connection', 'DELETE FROM File'],
    ]);
  });

  it('patches changed files without loading or replacing the complete cache', () => {
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

    expect(loadModule.loadWorkspaceAnalysisDatabaseCache).not.toHaveBeenCalled();
    expect(snapshotModule.readWorkspaceAnalysisDatabaseSnapshot).not.toHaveBeenCalled();
    expect(connectionModule.runStatementSync).not.toHaveBeenCalledWith('connection', 'DELETE FROM Edge');
    expect(connectionModule.runStatementSync).not.toHaveBeenCalledWith('connection', 'DELETE FROM Symbol');
    expect(connectionModule.runStatementSync).not.toHaveBeenCalledWith('connection', 'DELETE FROM Node');
    expect(connectionModule.runStatementSync).not.toHaveBeenCalledWith('connection', 'DELETE FROM File');
  });

  it('rolls back when normalized persistence fails', () => {
    vi.mocked(writeModule.persistWorkspaceCache).mockImplementationOnce(() => {
      throw new Error('write failed');
    });

    expect(() => saveWorkspaceAnalysisDatabaseCache('/workspace', cache)).toThrow('write failed');
    expect(connectionModule.runStatementSync).toHaveBeenCalledWith('connection', 'ROLLBACK');
  });

  it('writes asynchronously with file progress and cooperative yielding', async () => {
    const onProgress = vi.fn();
    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache, {
      onProgress,
      yieldEvery: 1,
    });

    expect(vi.mocked(connectionModule.runStatementAsync).mock.calls).toEqual([
      ['connection', 'BEGIN TRANSACTION'],
      ['connection', 'DELETE FROM Edge'],
      ['connection', 'DELETE FROM Symbol'],
      ['connection', 'DELETE FROM Node'],
      ['connection', 'DELETE FROM File'],
      ['connection', 'COMMIT'],
    ]);
    expect(onProgress.mock.calls).toEqual([
      [{ current: 0, total: 2 }],
      [{ current: 1, total: 2 }],
      [{ current: 2, total: 2 }],
    ]);
    expect(waitForImmediate).toHaveBeenCalledTimes(2);
  });

  it('does not write an async cache when the database directory is absent', async () => {
    vi.mocked(fs.existsSync).mockReturnValueOnce(false);
    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache);
    expect(connectionModule.withConnectionAsync).not.toHaveBeenCalled();
  });

  it('retries async corruption without replaying progress', async () => {
    const corruption = Object.assign(new Error('database disk image is malformed'), {
      code: 'SQLITE_CORRUPT',
    });
    const onProgress = vi.fn();
    let calls = 0;
    vi.mocked(writeModule.persistWorkspaceCacheAsync).mockImplementation(async (
      _writer,
      input,
      _graph,
      afterStatement,
    ) => {
      for (let index = 0; index < Object.keys(input.files).length; index += 1) {
        await afterStatement();
        calls += 1;
        if (calls === 2) throw corruption;
      }
    });
    vi.mocked(connectionModule.recreateInvalidDatabase).mockReturnValueOnce(true);

    await saveWorkspaceAnalysisDatabaseCacheAsync('/workspace', cache, { onProgress, yieldEvery: 1 });

    expect(connectionModule.withConnectionAsync).toHaveBeenCalledTimes(2);
    expect(onProgress.mock.calls).toEqual([
      [{ current: 0, total: 2 }],
      [{ current: 1, total: 2 }],
      [{ current: 2, total: 2 }],
    ]);
  });
});
