import { describe, expect, it, vi } from 'vitest';
import {
  persistAnalysisEntry,
  sortedCacheEntries,
} from '../../../../../../src/extension/pipeline/database/cache/query/write';
import * as cacheConnectionModule from '../../../../../../src/extension/pipeline/database/cache/io/connection';
import * as relationStatementModule from '../../../../../../src/extension/pipeline/database/cache/relation/statement';

describe('extension/pipeline/database/cache/writeStatements', () => {
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

  it('persists file, symbol, and relation statements in order', () => {
    const runStatementSyncSpy = vi
      .spyOn(cacheConnectionModule, 'runStatementSync')
      .mockImplementation(() => []);
    const createRelationStatementSpy = vi
      .spyOn(relationStatementModule, 'createRelationStatement')
      .mockReturnValue('RELATION');

    persistAnalysisEntry(
      {} as never,
      '/workspace/src/app.ts',
      {
        mtime: 10,
        size: 20,
        analysis: {
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
        },
      } as never,
    );

    expect(runStatementSyncSpy).toHaveBeenNthCalledWith(1, {}, expect.stringContaining('CREATE (entry:FileAnalysis'));
    expect(runStatementSyncSpy).toHaveBeenNthCalledWith(2, {}, expect.stringContaining('CREATE (entry:Symbol'));
    expect(createRelationStatementSpy).toHaveBeenCalledWith(
      '/workspace/src/app.ts',
      {
        filePath: '/workspace/src/app.ts',
        fromFilePath: '/workspace/src/app.ts',
        kind: 'import',
        sourceId: 'plugin:import',
      },
      0,
    );
    expect(runStatementSyncSpy).toHaveBeenNthCalledWith(3, {}, 'RELATION');
  });

  it('skips symbol and relation writes when the analysis omits them', () => {
    const runStatementSyncSpy = vi
      .spyOn(cacheConnectionModule, 'runStatementSync')
      .mockImplementation(() => []);

    persistAnalysisEntry(
      {} as never,
      '/workspace/src/app.ts',
      {
        mtime: 10,
        size: 20,
        analysis: {},
      } as never,
    );

    expect(runStatementSyncSpy).toHaveBeenCalledTimes(1);
    expect(runStatementSyncSpy).toHaveBeenCalledWith({}, expect.stringContaining('CREATE (entry:FileAnalysis'));
  });
});
