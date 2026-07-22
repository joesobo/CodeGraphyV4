import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceAnalysisCacheWriter,
  createWorkspaceAnalysisCacheWriterAsync,
  persistWorkspaceCache,
  persistWorkspaceCacheAsync,
  sortedCacheEntries,
  type WorkspaceAnalysisCacheWriter,
} from '../../../../src/graphCache/database/query/write';
import * as cacheConnectionModule from '../../../../src/graphCache/database/io/connection';

describe('graphCache/database/writeStatements', () => {
  it('sorts cache entries by file path', () => {
    const entries = sortedCacheEntries({
      files: {
        'src/z.ts': { mtime: 2, size: 1, analysis: { filePath: 'src/z.ts' } },
        'src/a.ts': { mtime: 1, size: 1, analysis: { filePath: 'src/a.ts' } },
      },
      version: '1',
    });
    expect(entries.map(([filePath]) => filePath)).toEqual(['src/a.ts', 'src/z.ts']);
  });

  it('prepares one statement for each canonical table', () => {
    const statements = [{}, {}, {}, {}, {}];
    const prepare = vi.spyOn(cacheConnectionModule, 'prepareStatementSync');
    statements.forEach(statement => prepare.mockReturnValueOnce(statement as never));

    expect(createWorkspaceAnalysisCacheWriter({} as never)).toEqual({
      connection: {},
      fileStatement: statements[0],
      nodeStatement: statements[1],
      symbolStatement: statements[2],
      edgeStatement: statements[3],
      nodeParentStatement: statements[4],
    });
    expect(prepare).toHaveBeenCalledTimes(5);
  });

  it('prepares one async statement for each canonical table', async () => {
    const statements = [{}, {}, {}, {}, {}];
    const prepare = vi.spyOn(cacheConnectionModule, 'prepareStatementAsync');
    statements.forEach(statement => prepare.mockResolvedValueOnce(statement as never));

    await expect(createWorkspaceAnalysisCacheWriterAsync({} as never)).resolves.toEqual({
      connection: {},
      fileStatement: statements[0],
      nodeStatement: statements[1],
      symbolStatement: statements[2],
      edgeStatement: statements[3],
      nodeParentStatement: statements[4],
    });
    expect(prepare).toHaveBeenCalledTimes(5);
  });

  it('stores file state and analysis facts as normalized records', () => {
    const execute = vi.spyOn(cacheConnectionModule, 'executeStatementSync').mockImplementation(() => []);
    vi.spyOn(cacheConnectionModule, 'readRowsSync')
      .mockReturnValueOnce([{ id: 1, key: 'src/app.ts' }])
      .mockReturnValueOnce([
        { id: 10, key: 'src/app.ts' },
        { id: 11, key: 'symbol-1' },
      ]);
    const writer = {
      connection: {} as never,
      fileStatement: { kind: 'file' } as never,
      nodeStatement: { kind: 'node' } as never,
      symbolStatement: { kind: 'symbol' } as never,
      edgeStatement: { kind: 'edge' } as never,
      nodeParentStatement: { kind: 'node-parent' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;
    const analysis = {
      filePath: '/workspace/src/app.ts',
      symbols: [{ id: 'symbol-1', filePath: '/workspace/src/app.ts', name: 'App', kind: 'class' }],
    };

    persistWorkspaceCache(writer, {
      version: '',
      files: {
        'src/app.ts': {
          mtime: 10,
          size: 20,
          contentHash: 'sha256:app',
          analysis,
        },
      },
    });

    expect(execute).toHaveBeenCalledWith(writer.connection, writer.fileStatement, {
      path: 'src/app.ts',
      mtime: 10,
      size: 20,
      contentHash: 'sha256:app',
    });
    expect(execute).toHaveBeenCalledWith(
      writer.connection,
      writer.symbolStatement,
      expect.objectContaining({
        nodeId: 11,
        name: 'App',
      }),
    );
  });

  it('stores nodes and edges as typed property-graph records', () => {
    const execute = vi.spyOn(cacheConnectionModule, 'executeStatementSync').mockImplementation(() => []);
    vi.spyOn(cacheConnectionModule, 'readRowsSync')
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        { id: 1, key: 'src/app.ts' },
        { id: 2, key: 'src/model.ts' },
      ]);
    const writer = {
      connection: {} as never,
      fileStatement: { kind: 'file' } as never,
      nodeStatement: { kind: 'node' } as never,
      symbolStatement: { kind: 'symbol' } as never,
      edgeStatement: { kind: 'edge' } as never,
      nodeParentStatement: { kind: 'node-parent' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;

    persistWorkspaceCache(writer, { version: '', files: {} }, {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', nodeType: 'file' },
        { id: 'src/model.ts', label: 'model.ts', nodeType: 'file' },
      ],
      edges: [{
        id: 'src/app.ts->src/model.ts#import',
        from: 'src/app.ts',
        to: 'src/model.ts',
        kind: 'import',
        sources: [],
      }],
    });

    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute).toHaveBeenLastCalledWith(
      writer.connection,
      writer.edgeStatement,
      {
        key: 'src/app.ts->src/model.ts#import',
        sourceNodeId: 1,
        targetNodeId: 2,
        type: 'import',
      },
    );
  });

  it('persists normalized records asynchronously and yields after each statement', async () => {
    const sequence: string[] = [];
    vi.spyOn(cacheConnectionModule, 'executeStatementAsync').mockImplementation(async () => {
      sequence.push('execute');
    });
    vi.spyOn(cacheConnectionModule, 'readRowsSync')
      .mockReturnValueOnce([{ id: 1, key: 'src/app.ts' }])
      .mockReturnValueOnce([{ id: 2, key: 'src/app.ts' }]);
    const afterStatement = vi.fn(async () => { sequence.push('yield'); });
    const writer = {
      connection: {} as never,
      fileStatement: { kind: 'file' } as never,
      nodeStatement: { kind: 'node' } as never,
      symbolStatement: { kind: 'symbol' } as never,
      edgeStatement: { kind: 'edge' } as never,
      nodeParentStatement: { kind: 'node-parent' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;

    await persistWorkspaceCacheAsync(
      writer,
      {
        version: '',
        files: { 'src/app.ts': { mtime: 0, analysis: { filePath: 'src/app.ts' } } },
      },
      undefined,
      {
        afterFile: async () => { sequence.push('file'); },
        afterStatement,
      },
    );

    expect(sequence).toEqual(['execute', 'yield', 'file', 'execute', 'yield']);
  });
});
