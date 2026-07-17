import { describe, expect, it, vi } from 'vitest';
import {
  createWorkspaceAnalysisCacheWriter,
  createWorkspaceAnalysisCacheWriterAsync,
  persistAnalysisEntry,
  persistAnalysisEntryAsync,
  persistGraph,
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
    const statements = [{}, {}, {}];
    const prepare = vi.spyOn(cacheConnectionModule, 'prepareStatementSync');
    statements.forEach(statement => prepare.mockReturnValueOnce(statement as never));

    expect(createWorkspaceAnalysisCacheWriter({} as never)).toEqual({
      connection: {},
      indexedFileStatement: statements[0],
      nodeStatement: statements[1],
      edgeStatement: statements[2],
    });
    expect(prepare).toHaveBeenCalledTimes(3);
  });

  it('prepares one async statement for each canonical table', async () => {
    const statements = [{}, {}, {}];
    const prepare = vi.spyOn(cacheConnectionModule, 'prepareStatementAsync');
    statements.forEach(statement => prepare.mockResolvedValueOnce(statement as never));

    await expect(createWorkspaceAnalysisCacheWriterAsync({} as never)).resolves.toEqual({
      connection: {},
      indexedFileStatement: statements[0],
      nodeStatement: statements[1],
      edgeStatement: statements[2],
    });
    expect(prepare).toHaveBeenCalledTimes(3);
  });

  it('stores complete raw file facts in IndexedFile', () => {
    const execute = vi.spyOn(cacheConnectionModule, 'executeStatementSync').mockImplementation(() => []);
    const writer = {
      connection: {} as never,
      indexedFileStatement: { kind: 'indexed-file' } as never,
      nodeStatement: { kind: 'node' } as never,
      edgeStatement: { kind: 'edge' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;
    const analysis = {
      filePath: '/workspace/src/app.ts',
      symbols: [{ id: 'symbol-1', filePath: '/workspace/src/app.ts', name: 'App', kind: 'class' }],
    };

    persistAnalysisEntry(writer, 'src/app.ts', {
      mtime: 10,
      size: 20,
      contentHash: 'sha256:app',
      analysis,
    });

    expect(execute).toHaveBeenCalledWith(writer.connection, writer.indexedFileStatement, {
      path: 'src/app.ts',
      mtime: 10,
      size: 20,
      contentHash: 'sha256:app',
      factsJson: JSON.stringify(analysis),
    });
  });

  it('stores nodes and edges as typed property-graph records', () => {
    const execute = vi.spyOn(cacheConnectionModule, 'executeStatementSync').mockImplementation(() => []);
    const writer = {
      connection: {} as never,
      indexedFileStatement: { kind: 'indexed-file' } as never,
      nodeStatement: { kind: 'node' } as never,
      edgeStatement: { kind: 'edge' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;

    persistGraph(writer, {
      nodes: [
        { id: 'src/app.ts', label: 'app.ts', color: '#fff', nodeType: 'file' },
        { id: 'src/model.ts', label: 'model.ts', color: '#fff', nodeType: 'file' },
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
    expect(execute).toHaveBeenLastCalledWith(writer.connection, writer.edgeStatement, {
      id: 'src/app.ts->src/model.ts#import',
      sourceId: 'src/app.ts',
      targetId: 'src/model.ts',
      type: 'import',
      propertiesJson: '{}',
      sourcesJson: '[]',
    });
  });

  it('persists one IndexedFile asynchronously before yielding', async () => {
    const sequence: string[] = [];
    vi.spyOn(cacheConnectionModule, 'executeStatementAsync').mockImplementation(async () => {
      sequence.push('execute');
    });
    const afterStatement = vi.fn(async () => { sequence.push('yield'); });
    const writer = {
      connection: {} as never,
      indexedFileStatement: { kind: 'indexed-file' } as never,
      nodeStatement: { kind: 'node' } as never,
      edgeStatement: { kind: 'edge' } as never,
    } satisfies WorkspaceAnalysisCacheWriter;

    await persistAnalysisEntryAsync(
      writer,
      'src/app.ts',
      { mtime: 0, analysis: { filePath: 'src/app.ts' } },
      afterStatement,
    );

    expect(sequence).toEqual(['execute', 'yield']);
  });
});
