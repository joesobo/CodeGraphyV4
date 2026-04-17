import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Connection, Database } from '@ladybugdb/core';
import {
  readRowsSync,
  runStatementSync,
  withConnection,
} from '../../../../../../src/extension/pipeline/database/cache/io/connection';

vi.mock('@ladybugdb/core', () => ({
  Connection: vi.fn(),
  Database: vi.fn(),
}));

describe('pipeline/database/cache/connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('closes every query result returned by runStatementSync', () => {
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const connection = {
      querySync: vi.fn().mockReturnValue([{ close: closeFirst }, { close: closeSecond }]),
    };

    runStatementSync(connection as never, 'MATCH (n) RETURN n');

    expect(connection.querySync).toHaveBeenCalledWith('MATCH (n) RETURN n');
    expect(closeFirst).toHaveBeenCalledOnce();
    expect(closeSecond).toHaveBeenCalledOnce();
  });

  it('reads rows from the first query result and still closes every result', () => {
    const getAllSync = vi.fn().mockReturnValue([{ filePath: 'src/app.ts' }]);
    const closeFirst = vi.fn();
    const closeSecond = vi.fn();
    const connection = {
      querySync: vi.fn().mockReturnValue([
        { getAllSync, close: closeFirst },
        { close: closeSecond },
      ]),
    };

    expect(readRowsSync(connection as never, 'MATCH (n) RETURN n')).toEqual([{ filePath: 'src/app.ts' }]);
    expect(getAllSync).toHaveBeenCalledOnce();
    expect(closeFirst).toHaveBeenCalledOnce();
    expect(closeSecond).toHaveBeenCalledOnce();
  });

  it('returns an empty array when rows cannot be read and still closes the result', () => {
    const close = vi.fn();
    const connection = {
      querySync: vi.fn().mockReturnValue({ close }),
    };

    expect(readRowsSync(connection as never, 'MATCH (n) RETURN n')).toEqual([]);
    expect(close).toHaveBeenCalledOnce();
  });

  it('tolerates missing query results when closing statements and reading rows', () => {
    const connection = {
      querySync: vi
        .fn()
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce([undefined]),
    };

    expect(() => runStatementSync(connection as never, 'MATCH (n) RETURN n')).not.toThrow();
    expect(readRowsSync(connection as never, 'MATCH (n) RETURN n')).toEqual([]);
  });

  it('best-effort closes query results even when close throws', () => {
    const connection = {
      querySync: vi.fn().mockReturnValue({ close: vi.fn().mockImplementation(() => {
        throw new Error('close failed');
      }) }),
    };

    expect(() => runStatementSync(connection as never, 'MATCH (n) RETURN n')).not.toThrow();
  });

  it('initializes the database, ensures the schema, runs the callback, and closes resources', () => {
    const initSync = vi.fn();
    const querySync = vi.fn().mockReturnValue({ close: vi.fn() });
    const closeConnection = vi.fn();
    const closeDatabase = vi.fn();
    const databaseInstance = { closeSync: closeDatabase };
    const connectionInstance = {
      initSync,
      querySync,
      closeSync: closeConnection,
    };
    vi.mocked(Database).mockImplementation(() => databaseInstance as never);
    vi.mocked(Connection).mockImplementation(() => connectionInstance as never);

    const value = withConnection('/workspace/.codegraphy/graph.lbug', (connection) => {
      expect(connection).toBe(connectionInstance);
      return 'ok';
    });

    expect(value).toBe('ok');
    expect(Database).toHaveBeenCalledWith('/workspace/.codegraphy/graph.lbug');
    expect(Connection).toHaveBeenCalledWith(databaseInstance);
    expect(initSync).toHaveBeenCalledOnce();
    expect(querySync).toHaveBeenCalledTimes(3);
    expect(querySync).toHaveBeenNthCalledWith(
      1,
      'CREATE NODE TABLE IF NOT EXISTS FileAnalysis(filePath STRING PRIMARY KEY, mtime INT64, size INT64, analysis STRING)',
    );
    expect(querySync).toHaveBeenNthCalledWith(
      2,
      'CREATE NODE TABLE IF NOT EXISTS Symbol(symbolId STRING PRIMARY KEY, filePath STRING, name STRING, kind STRING, signature STRING, rangeJson STRING, metadataJson STRING)',
    );
    expect(querySync).toHaveBeenNthCalledWith(
      3,
      'CREATE NODE TABLE IF NOT EXISTS Relation(relationId STRING PRIMARY KEY, filePath STRING, kind STRING, pluginId STRING, sourceId STRING, fromFilePath STRING, toFilePath STRING, fromNodeId STRING, toNodeId STRING, fromSymbolId STRING, toSymbolId STRING, specifier STRING, relationType STRING, variant STRING, resolvedPath STRING, metadataJson STRING)',
    );
    expect(closeConnection).toHaveBeenCalledOnce();
    expect(closeDatabase).toHaveBeenCalledOnce();
  });

  it('closes the connection and database when the callback throws', () => {
    const closeConnection = vi.fn();
    const closeDatabase = vi.fn();
    vi.mocked(Database).mockImplementation(() => ({ closeSync: closeDatabase }) as never);
    vi.mocked(Connection).mockImplementation(() => ({
      initSync: vi.fn(),
      querySync: vi.fn().mockReturnValue({ close: vi.fn() }),
      closeSync: closeConnection,
    }) as never);

    expect(() =>
      withConnection('/workspace/.codegraphy/graph.lbug', () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');

    expect(closeConnection).toHaveBeenCalledOnce();
    expect(closeDatabase).toHaveBeenCalledOnce();
  });
});
