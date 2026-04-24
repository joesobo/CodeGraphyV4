import { describe, expect, it } from 'vitest';
import { loadQueryContext } from '../../src/query/load';
import { readFileSummary } from '../../src/query/fileSummary';
import { createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('query/fileSummary', () => {
  it('reports declared symbols and relation counts for a file', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readFileSummary('src/a.ts', context);

    expect(result.summary).toMatchObject({
      filePath: 'src/a.ts',
      declaredSymbolCount: 1,
      incomingRelationCount: 1,
      outgoingRelationCount: 0,
    });
    expect(result.symbols).toEqual([
      expect.objectContaining({
        id: 'symbol:src/a.ts:exportAsJson',
      }),
    ]);
  });
});
