import { describe, expect, it } from 'vitest';
import { loadQueryContext } from '../../src/query/load';
import { readSymbolDependencies } from '../../src/query/symbolDependencies';
import { createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('query/symbolDependencies', () => {
  it('returns outgoing symbol relations', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readSymbolDependencies('symbol:src/c.ts:runner', context);

    expect(result.edges).toEqual([
      {
        from: 'symbol:src/c.ts:runner',
        to: 'symbol:src/b.ts:useExport',
        kind: 'call',
        supportCount: 1,
      },
    ]);
    expect(result.summary).toMatchObject({
      symbolId: 'symbol:src/c.ts:runner',
      relationCount: 1,
    });
  });
});
