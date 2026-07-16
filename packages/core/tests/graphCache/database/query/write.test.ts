import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceAnalysisCacheWriter,
  createWorkspaceAnalysisCacheWriterAsync,
  persistAnalysisEntry,
  persistAnalysisEntryAsync,
  sortedCacheEntries,
  type WorkspaceAnalysisCacheWriter,
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
    expect(prepareStatementSyncSpy).toHaveBeenNthCalledWith(1, {}, expect.stringContaining('@filePath'));
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
    expect(prepareStatementAsyncSpy).toHaveBeenNthCalledWith(1, {}, expect.stringContaining('@filePath'));
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
        contentHash: 'sha256:app',
        analysis,
      } as never,
    );

    expect(executeStatementSyncSpy).toHaveBeenCalledTimes(1);
    expect(executeStatementSyncSpy).toHaveBeenNthCalledWith(1, {}, { kind: 'file' }, {
      filePath: '/workspace/src/app.ts',
      mtime: 10,
      size: 20,
      contentHash: 'sha256:app',
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
      contentHash: null,
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
      contentHash: null,
      analysis: JSON.stringify({}),
    });
    expect(afterStatement).toHaveBeenCalledOnce();
    expect(sequence).toEqual(['execute', 'yield']);
  });
});
