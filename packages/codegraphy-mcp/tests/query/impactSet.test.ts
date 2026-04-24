import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadQueryContext } from '../../src/query/load';
import { readImpactSet } from '../../src/query/impactSet';
import { createTempCodeGraphyHome, createTempRepo } from '../support/database';
import { createSampleSnapshot } from '../support/sampleGraph';

describe('query/impactSet', () => {
  let originalHome: string | undefined;

  beforeEach(() => {
    originalHome = process.env.CODEGRAPHY_HOME;
    process.env.CODEGRAPHY_HOME = createTempCodeGraphyHome();
  });

  afterEach(() => {
    process.env.CODEGRAPHY_HOME = originalHome;
  });

  it('walks a bounded transitive symbol impact path', () => {
    const repo = createTempRepo(createSampleSnapshot());
    const context = loadQueryContext(repo.workspaceRoot);

    const result = readImpactSet('symbol:src/c.ts:runner', context, { maxDepth: 2 });

    expect(result.summary).toMatchObject({
      seedId: 'symbol:src/c.ts:runner',
      relationCount: 2,
    });
    expect(result.nodes.map((node) => node.id)).toEqual(expect.arrayContaining([
      'symbol:src/c.ts:runner',
      'symbol:src/b.ts:useExport',
      'symbol:src/a.ts:exportAsJson',
    ]));
  });
});
