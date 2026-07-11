import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceAnalysisCacheWriter,
  createWorkspaceAnalysisCacheWriterAsync,
  createWorkspaceAnalysisCachePatchWriterAsync,
  deleteAnalysisEntryAsync,
  persistAnalysisEntry,
  persistAnalysisEntryAsync,
  sortedCacheEntries,
  type WorkspaceAnalysisCacheWriter,
  type WorkspaceAnalysisCachePatchWriter,
} from '../../../../src/graphCache/database/query/write';
import * as cacheConnectionModule from '../../../../src/graphCache/database/io/connection';

describe('graphCache/database/writeStatements', () => {
  it('sorts cache entries by file path', () => {
    const entries = sortedCacheEntries({
      files: {
        'src/z.ts': { mtime: 2, size: 1, analysis: { symbols: [], relations: [] } },
        'src/a.ts': { mtime: 1, size: 1, analysis: { symbols: [], relations: [] } },
      },
      version: '1',
    } as never);

    expect(entries.map(([filePath]) => filePath)).toEqual(['src/a.ts', 'src/z.ts']);
  });

  it('prepares the canonical file analysis write statement once per cache write session', () => {
    const fileStatement = {};
    const prepareStatementSyncSpy = vi
      .spyOn(cacheConnectionModule, 'prepareStatementSync')
      .mockReturnValueOnce(fileStatement as never);

    expect(createWorkspaceAnalysisCacheWriter({} as never)).toEqual({
      connection: {},
      fileAnalysisStatement: fileStatement,
    });

    expect(prepareStatementSyncSpy).toHaveBeenCalledTimes(1);
    expect(prepareStatementSyncSpy).toHaveBeenNthCalledWith(1, {}, expect.stringContaining('filePath: $filePath'));
  });

  it('prepares the async canonical file analysis write statement once per cache write session', async () => {
    const fileStatement = {};
    const prepareStatementAsyncSpy = vi
      .spyOn(cacheConnectionModule, 'prepareStatementAsync')
      .mockResolvedValueOnce(fileStatement as never);

    await expect(createWorkspaceAnalysisCacheWriterAsync({} as never)).resolves.toEqual({
      connection: {},
      fileAnalysisStatement: fileStatement,
    });

    expect(prepareStatementAsyncSpy).toHaveBeenCalledTimes(1);
    expect(prepareStatementAsyncSpy).toHaveBeenNthCalledWith(1, {}, expect.stringContaining('filePath: $filePath'));
  });

  it('prepares every async patch statement once per cache write session', async () => {
    const statements = [{ kind: 'file' }, { kind: 'delete-file' }, { kind: 'delete-symbol' }, { kind: 'delete-relation' }];
    const prepareStatementAsyncSpy = vi
      .spyOn(cacheConnectionModule, 'prepareStatementAsync')
      .mockResolvedValueOnce(statements[0] as never)
      .mockResolvedValueOnce(statements[1] as never)
      .mockResolvedValueOnce(statements[2] as never)
      .mockResolvedValueOnce(statements[3] as never);

    await expect(createWorkspaceAnalysisCachePatchWriterAsync({} as never)).resolves.toEqual({
      connection: {},
      fileAnalysisStatement: statements[0],
      deleteFileAnalysisStatement: statements[1],
      deleteSymbolStatement: statements[2],
      deleteRelationStatement: statements[3],
    });

    expect(prepareStatementAsyncSpy).toHaveBeenCalledTimes(4);
  });

  it('persists one canonical file analysis row through a prepared statement', () => {
    const executeStatementSyncSpy = vi
      .spyOn(cacheConnectionModule, 'executeStatementSync')
      .mockImplementation(() => []);
    const writer = {
      connection: {} as never,
      fileAnalysisStatement: { kind: 'file' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;
    const analysis = {
      symbols: [
        {
          id: 'symbol-1',
          filePath: '/workspace/src/app.ts',
          name: 'App',
          kind: 'class',
        },
      ],
      relations: [
        {
          filePath: '/workspace/src/app.ts',
          fromFilePath: '/workspace/src/app.ts',
          kind: 'import',
          sourceId: 'plugin:import',
        },
      ],
    };

    persistAnalysisEntry(
      writer,
      '/workspace/src/app.ts',
      {
        mtime: 10,
        size: 20,
        analysis,
      } as never,
    );

    expect(executeStatementSyncSpy).toHaveBeenCalledTimes(1);
    expect(executeStatementSyncSpy).toHaveBeenNthCalledWith(1, {}, { kind: 'file' }, {
      filePath: '/workspace/src/app.ts',
      mtime: 10,
      size: 20,
      analysis: JSON.stringify(analysis),
    });
  });

  it('persists only the canonical row when the analysis omits symbols and relations', () => {
    const executeStatementSyncSpy = vi
      .spyOn(cacheConnectionModule, 'executeStatementSync')
      .mockImplementation(() => []);
    const writer = {
      connection: {} as never,
      fileAnalysisStatement: { kind: 'file' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;

    persistAnalysisEntry(
      writer,
      '/workspace/src/app.ts',
      {
        mtime: 10,
        size: 20,
        analysis: {},
      } as never,
    );

    expect(executeStatementSyncSpy).toHaveBeenCalledTimes(1);
    expect(executeStatementSyncSpy).toHaveBeenCalledWith(writer.connection, writer.fileAnalysisStatement, {
      filePath: '/workspace/src/app.ts',
      mtime: 10,
      size: 20,
      analysis: JSON.stringify({}),
    });
  });

  it('persists one canonical file analysis row asynchronously before yielding', async () => {
    const sequence: string[] = [];
    const executeStatementAsyncSpy = vi
      .spyOn(cacheConnectionModule, 'executeStatementAsync')
      .mockImplementation(async () => {
        sequence.push('execute');
      });
    const afterStatement = vi.fn(async () => {
      sequence.push('yield');
    });
    const writer = {
      connection: {} as never,
      fileAnalysisStatement: { kind: 'file' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;

    await persistAnalysisEntryAsync(
      writer,
      '/workspace/src/app.ts',
      {
        analysis: {},
      } as never,
      afterStatement,
    );

    expect(executeStatementAsyncSpy).toHaveBeenCalledTimes(1);
    expect(executeStatementAsyncSpy).toHaveBeenNthCalledWith(1, {}, { kind: 'file' }, {
      filePath: '/workspace/src/app.ts',
      mtime: 0,
      size: 0,
      analysis: JSON.stringify({}),
    });
    expect(afterStatement).toHaveBeenCalledOnce();
    expect(sequence).toEqual(['execute', 'yield']);
  });

  it('deletes every canonical row for one file asynchronously', async () => {
    const executeStatementAsyncSpy = vi
      .spyOn(cacheConnectionModule, 'executeStatementAsync')
      .mockResolvedValue(undefined);
    const writer = {
      connection: {} as never,
      fileAnalysisStatement: { kind: 'file' } as never,
      deleteFileAnalysisStatement: { kind: 'delete-file' } as never,
      deleteSymbolStatement: { kind: 'delete-symbol' } as never,
      deleteRelationStatement: { kind: 'delete-relation' } as never,
    } satisfies WorkspaceAnalysisCachePatchWriter;

    await deleteAnalysisEntryAsync(writer, 'src/app.ts');

    expect(executeStatementAsyncSpy).toHaveBeenNthCalledWith(
      1,
      writer.connection,
      writer.deleteFileAnalysisStatement,
      { filePath: 'src/app.ts' },
    );
    expect(executeStatementAsyncSpy).toHaveBeenNthCalledWith(
      2,
      writer.connection,
      writer.deleteSymbolStatement,
      { filePath: 'src/app.ts' },
    );
    expect(executeStatementAsyncSpy).toHaveBeenNthCalledWith(
      3,
      writer.connection,
      writer.deleteRelationStatement,
      { filePath: 'src/app.ts' },
    );
  });
});
